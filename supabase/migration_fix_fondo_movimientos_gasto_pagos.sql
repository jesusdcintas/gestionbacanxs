create or replace function public.guardar_gasto_con_pagos(
  p_gasto_id uuid,
  p_concepto text,
  p_cantidad numeric,
  p_categoria text,
  p_tipo_gasto text,
  p_fecha date,
  p_evento_id uuid,
  p_reembolsado boolean,
  p_fuentes jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_gasto_id uuid;
  v_suma_fuentes numeric(10,2);
  v_tipo_gasto text;
  v_total_fondo numeric(10,2);
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad del gasto debe ser mayor a 0';
  end if;

  v_tipo_gasto := coalesce(nullif(trim(p_tipo_gasto), ''), 'directo_evento');

  if v_tipo_gasto not in ('directo_evento', 'inversion_empresa', 'consumible') then
    raise exception 'Tipo de gasto no válido';
  end if;

  if v_tipo_gasto = 'directo_evento' and p_evento_id is null then
    raise exception 'Los gastos directos de evento deben tener evento_id';
  end if;

  if v_tipo_gasto in ('inversion_empresa', 'consumible') and (p_fuentes is null or jsonb_typeof(p_fuentes) <> 'array' or jsonb_array_length(p_fuentes) = 0) then
    raise exception 'Debes enviar al menos una fuente de pago';
  end if;

  select coalesce(sum((x.value->>'cantidad')::numeric), 0)
  into v_suma_fuentes
  from jsonb_array_elements(coalesce(p_fuentes, '[]'::jsonb)) x
  where coalesce((x.value->>'cantidad')::numeric, 0) > 0;

  if v_tipo_gasto in ('inversion_empresa', 'consumible') and abs(v_suma_fuentes - p_cantidad) > 0.01 then
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
      reembolsado,
      created_by
    )
    values (
      p_concepto,
      p_cantidad,
      coalesce(nullif(trim(p_categoria), ''), 'Otros'),
      v_tipo_gasto,
      coalesce(p_fecha, current_date),
      p_evento_id,
      coalesce(p_reembolsado, false),
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
      reembolsado = coalesce(p_reembolsado, false),
      updated_at = now()
    where id = p_gasto_id;

    if not found then
      raise exception 'Gasto no encontrado';
    end if;

    v_gasto_id := p_gasto_id;

    delete from public.gasto_pagos where gasto_id = v_gasto_id;
  end if;

  -- Recalcular salida de fondo de este gasto: borrar y recrear.
  delete from public.fondo_movimientos
  where gasto_id = v_gasto_id
    and cantidad < 0
    and coalesce(concepto, '') not like 'Reembolso a socios:%'
    and coalesce(concepto, '') not like 'Reembolso a socio:%';

  insert into public.gasto_pagos (gasto_id, socio_id, cantidad)
  select
    v_gasto_id,
    nullif(value->>'socio_id', '')::uuid,
    (value->>'cantidad')::numeric
  from jsonb_array_elements(coalesce(p_fuentes, '[]'::jsonb))
  where coalesce((value->>'cantidad')::numeric, 0) > 0;

  select coalesce(sum(gp.cantidad), 0)
  into v_total_fondo
  from public.gasto_pagos gp
  where gp.gasto_id = v_gasto_id
    and gp.socio_id is null;

  if v_total_fondo > 0 then
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

insert into public.fondo_movimientos (fecha, concepto, cantidad, evento_id, gasto_id)
select
  '2026-05-12'::date,
  'Thomann sub + conectores xlr y jack',
  -400.00,
  null,
  '312a99fe-4dce-4900-a1d1-e72780ec775b'::uuid
where not exists (
  select 1
  from public.fondo_movimientos fm
  where fm.gasto_id = '312a99fe-4dce-4900-a1d1-e72780ec775b'::uuid
    and fm.fecha = '2026-05-12'::date
    and fm.cantidad = -400.00
    and fm.concepto = 'Thomann sub + conectores xlr y jack'
);