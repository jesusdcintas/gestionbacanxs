create or replace function public.convertir_gasto_en_aportacion(
  p_gasto_id uuid,
  p_socio_id uuid,
  p_cantidad numeric,
  p_concepto_gasto text
)
returns void
language plpgsql
security definer
as $$
declare
  v_match numeric(10,2);
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a 0';
  end if;

  if p_gasto_id is null or p_socio_id is null then
    raise exception 'gasto_id y socio_id son obligatorios';
  end if;

  select coalesce(sum(gp.cantidad), 0)
  into v_match
  from public.gasto_pagos gp
  join public.gastos g on g.id = gp.gasto_id
  where gp.gasto_id = p_gasto_id
    and gp.socio_id = p_socio_id
    and g.reembolsado = false;

  if v_match <= 0 then
    raise exception 'No existe un pendiente para ese socio y gasto';
  end if;

  if p_cantidad - v_match > 0.01 then
    raise exception 'La cantidad a convertir supera el pendiente del socio en ese gasto';
  end if;

  update public.gastos
  set reembolsado = true,
      updated_at = now()
  where id = p_gasto_id;

  insert into public.aportaciones (socio_id, cantidad, fecha, concepto, created_by)
  values (
    p_socio_id,
    p_cantidad,
    current_date,
    'Aportación por gasto no reembolsado: ' || p_concepto_gasto,
    auth.uid()
  );
end;
$$;

create or replace function public.liquidar_diferencia_socios(
  p_socio_acreedor_id uuid,
  p_cantidad numeric,
  p_pagar_desde_fondo boolean,
  p_fecha date default current_date,
  p_concepto text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_restante numeric(10,2);
  v_aplicado numeric(10,2) := 0;
  v_gastos_marcados integer := 0;
  v_gasto record;
begin
  if p_socio_acreedor_id is null then
    raise exception 'El socio acreedor es obligatorio';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad a liquidar debe ser mayor a 0';
  end if;

  v_restante := p_cantidad;

  -- Criterio simple: FIFO por gastos completos, sin parcial.
  for v_gasto in
    select
      g.id,
      g.fecha,
      g.concepto,
      sum(gp.cantidad)::numeric(10,2) as cantidad_socio
    from public.gastos g
    join public.gasto_pagos gp on gp.gasto_id = g.id
    where g.reembolsado = false
      and gp.socio_id = p_socio_acreedor_id
      and not exists (
        select 1
        from public.gasto_pagos gp2
        where gp2.gasto_id = g.id
          and gp2.socio_id is not null
          and gp2.socio_id <> p_socio_acreedor_id
      )
    group by g.id, g.fecha, g.concepto, g.created_at
    order by g.fecha asc, g.created_at asc, g.id asc
  loop
    exit when v_restante <= 0;

    if v_gasto.cantidad_socio <= v_restante + 0.01 then
      update public.gastos
      set reembolsado = true,
          updated_at = now()
      where id = v_gasto.id;

      v_aplicado := v_aplicado + v_gasto.cantidad_socio;
      v_restante := greatest(v_restante - v_gasto.cantidad_socio, 0);
      v_gastos_marcados := v_gastos_marcados + 1;
    end if;
  end loop;

  if p_pagar_desde_fondo and v_aplicado > 0 then
    insert into public.fondo_movimientos (fecha, concepto, cantidad)
    values (
      coalesce(p_fecha, current_date),
      coalesce(nullif(trim(p_concepto), ''), 'Liquidación de diferencia entre socios'),
      -v_aplicado
    );
  end if;

  return jsonb_build_object(
    'socio_acreedor_id', p_socio_acreedor_id,
    'cantidad_solicitada', round(p_cantidad, 2),
    'cantidad_aplicada', round(v_aplicado, 2),
    'cantidad_no_aplicada', round(greatest(p_cantidad - v_aplicado, 0), 2),
    'gastos_marcados', v_gastos_marcados,
    'pagado_desde_fondo', p_pagar_desde_fondo,
    'criterio', 'FIFO sin parcial por gasto'
  );
end;
$$;