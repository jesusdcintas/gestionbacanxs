begin;

-- Fix: al validar nuevas tandas, el neto repartible solo debe descontar gastos de tipo 'directo_evento'.
-- No modifica datos historicos; solo reemplaza la logica de la funcion.
create or replace function public.registrar_reparto_evento(
  p_evento_id uuid,
  p_fecha date,
  p_concepto text,
  p_repartos jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_evento record;
  v_neto_repartible numeric;
  v_ya_repartido numeric;
  v_tanda numeric;
  v_restante numeric;
begin
  if p_repartos is null or jsonb_typeof(p_repartos) <> 'array' then
    raise exception 'p_repartos debe ser un array jsonb';
  end if;

  select id, nombre, fecha, presupuesto, con_factura, retencion_irpf
  into v_evento
  from public.eventos
  where id = p_evento_id;

  if not found then
    raise exception 'Evento no encontrado';
  end if;

  select
    (case
      when v_evento.con_factura then (v_evento.presupuesto / 1.21)
      else v_evento.presupuesto
    end)
    - (case
      when v_evento.con_factura then ((v_evento.presupuesto / 1.21) * coalesce(v_evento.retencion_irpf, 0) / 100)
      else 0
    end)
    - coalesce((
      select sum(g.cantidad)
      from public.gastos g
      where g.evento_id = p_evento_id
        and g.tipo_gasto = 'directo_evento'
    ), 0)
  into v_neto_repartible;

  select coalesce(sum(r.cantidad), 0)
  into v_ya_repartido
  from public.repartos_evento r
  where r.evento_id = p_evento_id;

  select coalesce(sum((elem->>'cantidad')::numeric), 0)
  into v_tanda
  from jsonb_array_elements(p_repartos) elem
  where coalesce((elem->>'cantidad')::numeric, 0) > 0;

  v_restante := v_neto_repartible - v_ya_repartido;

  if v_tanda <= 0 then
    raise exception 'La tanda debe incluir al menos una cantidad mayor que 0';
  end if;

  if v_tanda > v_restante + 0.01 then
    raise exception 'La tanda (%) supera lo pendiente (%)',
      to_char(v_tanda, 'FM999999990.00'),
      to_char(v_restante, 'FM999999990.00');
  end if;

  with inserted_repartos as (
    insert into public.repartos_evento (evento_id, socio_id, cantidad, fecha, concepto)
    select
      p_evento_id,
      nullif(elem->>'socio_id', '')::uuid,
      (elem->>'cantidad')::numeric,
      coalesce(p_fecha, current_date),
      nullif(trim(coalesce(p_concepto, '')), '')
    from jsonb_array_elements(p_repartos) elem
    where coalesce((elem->>'cantidad')::numeric, 0) > 0
    returning id, evento_id, socio_id, cantidad, fecha, concepto
  )
  insert into public.fondo_movimientos (fecha, concepto, cantidad, evento_id, reparto_id)
  select
    ir.fecha,
    coalesce(
      nullif(trim(coalesce(ir.concepto, '')), ''),
      'Reparto a fondo del evento "' || coalesce(v_evento.nombre, p_evento_id::text) || '"'
    ),
    ir.cantidad,
    ir.evento_id,
    ir.id
  from inserted_repartos ir
  where ir.socio_id is null
    and ir.cantidad > 0;
end;
$$;

commit;
