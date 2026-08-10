begin;

-- --------------------------------------------------------------------------
-- 1) Gastos previstos / pagados
-- --------------------------------------------------------------------------
alter table public.gastos
  add column if not exists pagado boolean not null default true;

-- --------------------------------------------------------------------------
-- 2) Reparto: solo descuenta gastos de evento realmente pagados
-- --------------------------------------------------------------------------
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
        and g.pagado = true
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
  where ir.socio_id is null;
end;
$$;

-- --------------------------------------------------------------------------
-- 3) RPC gastos: soportar previsto/pagado
-- --------------------------------------------------------------------------
create or replace function public.guardar_gasto_con_pagos(
  p_gasto_id uuid,
  p_concepto text,
  p_cantidad numeric,
  p_categoria text,
  p_tipo_gasto text,
  p_fecha date,
  p_evento_id uuid,
  p_reembolsado boolean,
  p_forma_pago text,
  p_tipo_factura text,
  p_factura_path text,
  p_fuentes jsonb,
  p_pagado boolean default true
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_gasto_id uuid;
  v_suma_fuentes numeric(10,2);
  v_tipo_gasto text;
  v_forma_pago text;
  v_tipo_factura text;
  v_total_fondo numeric(10,2);
  v_pagado boolean;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad del gasto debe ser mayor a 0';
  end if;

  v_tipo_gasto := coalesce(nullif(trim(p_tipo_gasto), ''), 'directo_evento');
  v_forma_pago := nullif(trim(coalesce(p_forma_pago, '')), '');
  v_tipo_factura := nullif(trim(coalesce(p_tipo_factura, '')), '');
  v_pagado := coalesce(p_pagado, true);

  if v_tipo_gasto not in ('directo_evento', 'inversion_empresa') then
    raise exception 'Tipo de gasto no válido';
  end if;

  if v_forma_pago is not null and v_forma_pago not in ('tarjeta', 'transferencia', 'efectivo') then
    raise exception 'Forma de pago no válida';
  end if;

  if v_tipo_factura is not null and v_tipo_factura not in ('A', 'B') then
    raise exception 'Tipo de factura no válido';
  end if;

  if v_tipo_gasto = 'directo_evento' and p_evento_id is null then
    raise exception 'Los gastos directos de evento deben tener evento_id';
  end if;

  if v_pagado and v_tipo_gasto = 'inversion_empresa' and (p_fuentes is null or jsonb_typeof(p_fuentes) <> 'array' or jsonb_array_length(p_fuentes) = 0) then
    raise exception 'Debes enviar al menos una fuente de pago';
  end if;

  select coalesce(sum((x.value->>'cantidad')::numeric), 0)
  into v_suma_fuentes
  from jsonb_array_elements(coalesce(p_fuentes, '[]'::jsonb)) x
  where coalesce((x.value->>'cantidad')::numeric, 0) > 0;

  if v_pagado and v_tipo_gasto = 'inversion_empresa' and abs(v_suma_fuentes - p_cantidad) > 0.01 then
    raise exception 'La suma de fuentes (%) no coincide con la cantidad del gasto (%)', v_suma_fuentes, p_cantidad;
  end if;

  if p_gasto_id is null then
    insert into public.gastos (
      concepto,
      cantidad,
      categoria,
      tipo_gasto,
      fecha,
      evento_id,
      pagado,
      reembolsado,
      forma_pago,
      tipo_factura,
      factura_path,
      created_by
    )
    values (
      p_concepto,
      p_cantidad,
      coalesce(nullif(trim(p_categoria), ''), 'Otros'),
      v_tipo_gasto,
      coalesce(p_fecha, current_date),
      p_evento_id,
      v_pagado,
      case when v_pagado then coalesce(p_reembolsado, false) else false end,
      case when v_pagado then v_forma_pago else null end,
      v_tipo_factura,
      nullif(trim(coalesce(p_factura_path, '')), ''),
      auth.uid()
    )
    returning id into v_gasto_id;
  else
    update public.gastos
    set
      concepto = p_concepto,
      cantidad = p_cantidad,
      categoria = coalesce(nullif(trim(p_categoria), ''), 'Otros'),
      tipo_gasto = v_tipo_gasto,
      fecha = coalesce(p_fecha, fecha),
      evento_id = p_evento_id,
      pagado = v_pagado,
      reembolsado = case when v_pagado then coalesce(p_reembolsado, false) else false end,
      forma_pago = case when v_pagado then v_forma_pago else null end,
      tipo_factura = v_tipo_factura,
      factura_path = nullif(trim(coalesce(p_factura_path, '')), ''),
      updated_at = now()
    where id = p_gasto_id;

    if not found then
      raise exception 'Gasto no encontrado';
    end if;

    v_gasto_id := p_gasto_id;

    delete from public.gasto_pagos where gasto_id = v_gasto_id;
  end if;

  delete from public.fondo_movimientos
  where gasto_id = v_gasto_id
    and cantidad < 0
    and coalesce(concepto, '') not like 'Reembolso a socios:%'
    and coalesce(concepto, '') not like 'Reembolso a socio:%';

  if v_pagado then
    insert into public.gasto_pagos (gasto_id, socio_id, cantidad)
    select
      v_gasto_id,
      nullif(value->>'socio_id', '')::uuid,
      (value->>'cantidad')::numeric
    from jsonb_array_elements(coalesce(p_fuentes, '[]'::jsonb))
    where coalesce((value->>'cantidad')::numeric, 0) > 0;
  end if;

  select coalesce(sum(gp.cantidad), 0)
  into v_total_fondo
  from public.gasto_pagos gp
  where gp.gasto_id = v_gasto_id
    and gp.socio_id is null;

  if v_pagado and v_total_fondo > 0 then
    insert into public.fondo_movimientos (fecha, concepto, cantidad, evento_id, gasto_id)
    values (
      coalesce(p_fecha, current_date),
      p_concepto,
      -v_total_fondo,
      p_evento_id,
      v_gasto_id
    );
  end if;

  return v_gasto_id;
end;
$$;

commit;
