-- ============================================================================
-- MIGRACION: GASTOS CON MULTIPLES FUENTES DE PAGO
-- ============================================================================
-- Objetivo:
-- 1) Crear tabla gasto_pagos para permitir pago mixto por gasto.
-- 2) Migrar datos existentes desde gastos.pagado_por al nuevo modelo:
--    - pagado_por is null   -> fuente Fondo (socio_id null)
--    - pagado_por not null  -> fuente Socio (socio_id = pagado_por)
-- 3) Reemplazar RPC de guardado de gastos por versión atómica con fuentes.
-- 4) Adaptar RPC reembolsar_gasto al nuevo modelo.
--
-- Script idempotente: se puede ejecutar varias veces sin duplicar datos.
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- 1) Tabla gasto_pagos
-- --------------------------------------------------------------------------
create table if not exists public.gasto_pagos (
  id uuid primary key default uuid_generate_v4(),
  gasto_id uuid not null references public.gastos(id) on delete cascade,
  socio_id uuid null references public.profiles(id) on delete set null,
  cantidad numeric(10,2) not null check (cantidad > 0),
  created_at timestamptz default now()
);

create index if not exists idx_gasto_pagos_gasto_id on public.gasto_pagos (gasto_id);
create index if not exists idx_gasto_pagos_socio_id on public.gasto_pagos (socio_id);

-- Evita duplicar la misma fuente dentro de un gasto.
create unique index if not exists uq_gasto_pagos_gasto_fuente
  on public.gasto_pagos (gasto_id, coalesce(socio_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.gasto_pagos enable row level security;

drop policy if exists authenticated_all on public.gasto_pagos;
create policy authenticated_all on public.gasto_pagos
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- --------------------------------------------------------------------------
-- 2) Migracion de datos legacy (gastos.pagado_por)
-- --------------------------------------------------------------------------
-- Solo inserta si ese gasto aun no tiene fuentes en gasto_pagos.
insert into public.gasto_pagos (gasto_id, socio_id, cantidad)
select
  g.id,
  g.pagado_por,
  g.cantidad
from public.gastos g
where not exists (
  select 1
  from public.gasto_pagos gp
  where gp.gasto_id = g.id
);

-- --------------------------------------------------------------------------
-- 3) RPC atómica: guardar_gasto_con_pagos
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

  if p_fuentes is null or jsonb_typeof(p_fuentes) <> 'array' or jsonb_array_length(p_fuentes) = 0 then
    raise exception 'Debes enviar al menos una fuente de pago';
  end if;

  select coalesce(sum((x.value->>'cantidad')::numeric), 0)
  into v_suma_fuentes
  from jsonb_array_elements(p_fuentes) x
  where coalesce((x.value->>'cantidad')::numeric, 0) > 0;

  if abs(v_suma_fuentes - p_cantidad) > 0.01 then
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
  from jsonb_array_elements(p_fuentes)
  where coalesce((value->>'cantidad')::numeric, 0) > 0;

  return v_gasto_id;
end;
$$;

-- --------------------------------------------------------------------------
-- 4) RPC reembolsar_gasto adaptada a multiples fuentes
-- --------------------------------------------------------------------------
create or replace function public.reembolsar_gasto(
  p_gasto_id uuid,
  p_fecha date default current_date
)
returns void
language plpgsql
security definer
as $$
declare
  v_gasto record;
  v_total_socios numeric(10,2);
begin
  select * into v_gasto from public.gastos where id = p_gasto_id;

  if not found then
    raise exception 'Gasto no encontrado';
  end if;

  if v_gasto.reembolsado = true then
    raise exception 'Este gasto ya ha sido reembolsado';
  end if;

  select coalesce(sum(gp.cantidad), 0)
  into v_total_socios
  from public.gasto_pagos gp
  where gp.gasto_id = p_gasto_id
    and gp.socio_id is not null;

  if v_total_socios <= 0 then
    raise exception 'Este gasto no tiene aportacion de socios, no requiere reembolso';
  end if;

  update public.gastos
  set reembolsado = true,
      updated_at = now()
  where id = p_gasto_id;

  insert into public.fondo_movimientos (fecha, concepto, cantidad, gasto_id)
  values (
    coalesce(p_fecha, current_date),
    'Reembolso a socios: ' || v_gasto.concepto,
    -v_total_socios,
    p_gasto_id
  );
end;
$$;

commit;
