-- ============================================================================
-- MIGRACION: TIPO DE GASTO (DIRECTO EVENTO VS INVERSION EMPRESA)
-- ============================================================================
-- Objetivo:
-- 1) Añadir tipo_gasto en gastos.
-- 2) Mantener comportamiento actual en gastos con evento_id (directo_evento).
-- 3) Clasificar gastos sin evento como inversion_empresa para evitar afectar repartos.
-- 4) Actualizar RPC guardar_gasto_con_pagos con p_tipo_gasto y validaciones.
--
-- Script idempotente: se puede ejecutar varias veces.
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- 1) Nuevo campo tipo_gasto
-- --------------------------------------------------------------------------
alter table public.gastos
  add column if not exists tipo_gasto text not null default 'directo_evento';

-- Asegura dominio de valores válidos (idempotente)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gastos_tipo_gasto_check'
      and conrelid = 'public.gastos'::regclass
  ) then
    alter table public.gastos
      add constraint gastos_tipo_gasto_check
      check (tipo_gasto in ('directo_evento', 'inversion_empresa'));
  end if;
end $$;

-- Backfill seguro para datos existentes
-- - Si tiene evento_id => directo_evento
-- - Si no tiene evento_id => inversion_empresa
update public.gastos
set tipo_gasto = case
  when evento_id is not null then 'directo_evento'
  else 'inversion_empresa'
end
where tipo_gasto not in ('directo_evento', 'inversion_empresa')
   or tipo_gasto is null
   or (tipo_gasto = 'directo_evento' and evento_id is null)
   or (tipo_gasto = 'inversion_empresa' and evento_id is not null and false);

-- --------------------------------------------------------------------------
-- 2) RPC guardar_gasto_con_pagos con tipo_gasto
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
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad del gasto debe ser mayor a 0';
  end if;

  v_tipo_gasto := coalesce(nullif(trim(p_tipo_gasto), ''), 'directo_evento');

  if v_tipo_gasto not in ('directo_evento', 'inversion_empresa') then
    raise exception 'Tipo de gasto no válido';
  end if;

  if v_tipo_gasto = 'directo_evento' and p_evento_id is null then
    raise exception 'Los gastos directos de evento deben tener evento_id';
  end if;

  if v_tipo_gasto in ('inversion_empresa') and (p_fuentes is null or jsonb_typeof(p_fuentes) <> 'array' or jsonb_array_length(p_fuentes) = 0) then
    raise exception 'Debes enviar al menos una fuente de pago';
  end if;

  select coalesce(sum((x.value->>'cantidad')::numeric), 0)
  into v_suma_fuentes
  from jsonb_array_elements(coalesce(p_fuentes, '[]'::jsonb)) x
  where coalesce((x.value->>'cantidad')::numeric, 0) > 0;

  if v_tipo_gasto in ('inversion_empresa') and abs(v_suma_fuentes - p_cantidad) > 0.01 then
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

  insert into public.gasto_pagos (gasto_id, socio_id, cantidad)
  select
    v_gasto_id,
    nullif(value->>'socio_id', '')::uuid,
    (value->>'cantidad')::numeric
  from jsonb_array_elements(coalesce(p_fuentes, '[]'::jsonb))
  where coalesce((value->>'cantidad')::numeric, 0) > 0;

  return v_gasto_id;
end;
$$;

commit;
