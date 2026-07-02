-- Gestor Bacanxs - Esquema V2 (Modelo Financiero Refinado)
-- Ejecutar en el SQL Editor de Supabase
-- Este esquema reemplaza completamente el anterior

-- ============================================================================
-- LIMPIEZA (si es necesario volver a ejecutar)
-- ============================================================================

-- Descomenta estas líneas si necesitas limpiar y empezar de cero:
-- drop table if exists public.fondo_movimientos cascade;
-- drop table if exists public.evento_trabajadores cascade;
-- drop table if exists public.repartos_evento cascade;
-- drop table if exists public.pagos_evento cascade;
-- drop table if exists public.gastos cascade;
-- drop table if exists public.eventos cascade;
-- drop table if exists public.profiles cascade;
-- drop function if exists public.registrar_reparto_evento cascade;
-- drop function if exists public.sync_evento_trabajadores cascade;
-- drop function if exists public.resumen_trabajo_socios cascade;
-- drop function if exists public.reembolsar_gasto cascade;

-- ============================================================================
-- EXTENSIONES
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ============================================================================
-- PERFILES (1:1 con auth.users)
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key,
  nombre text not null,
  created_at timestamptz default now()
);

-- ============================================================================
-- EVENTOS
-- ============================================================================

create table if not exists public.eventos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  fecha date,
  lugar text,
  cliente text,
  presupuesto numeric(10,2) not null default 0,
  con_factura boolean default false,
  retencion_irpf numeric(5,2) default 20.00,
  estado_financiero text default 'no_pagado' check (estado_financiero in ('no_pagado','parcialmente_pagado','pagado')),
  estado_trabajo text default 'confirmado' check (estado_trabajo in ('confirmado','realizado','cancelado')),
  estado_completo text generated always as (
    case

create table if not exists public.gasto_pagos (
  id uuid primary key default uuid_generate_v4(),
  gasto_id uuid not null references public.gastos(id) on delete cascade,
  socio_id uuid null references public.profiles(id) on delete set null,
  cantidad numeric(10,2) not null check (cantidad > 0),
  created_at timestamptz default now()
);
      when estado_trabajo = 'realizado' and estado_financiero = 'pagado' then 'completado'
      else estado_trabajo
    end
  ) stored,
  observaciones text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- PAGOS RECIBIDOS (de clientes por eventos)
-- ============================================================================

create table if not exists public.pagos_evento (
  id uuid primary key default uuid_generate_v4(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  fecha date not null,
  cantidad numeric(10,2) not null check (cantidad > 0),
  concepto text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ============================================================================
-- GASTOS (de eventos o generales de empresa)
-- ============================================================================

create table if not exists public.gastos (
  id uuid primary key default uuid_generate_v4(),
  concepto text not null,
  cantidad numeric(10,2) not null check (cantidad > 0),
  categoria text not null,
  tipo_gasto text not null default 'directo_evento' check (tipo_gasto in ('directo_evento', 'inversion_empresa')),
  fecha date not null,
  evento_id uuid references public.eventos(id) on delete set null,
  pagado_por uuid references public.profiles(id),  -- null = pagado por la empresa
  reembolsado boolean default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- REPARTO DEL NETO (cómo se distribuye el neto repartible de cada evento)
-- ============================================================================

create table if not exists public.repartos_evento (
  id uuid primary key default uuid_generate_v4(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  socio_id uuid references public.profiles(id),  -- null = fondo de empresa
  cantidad numeric(10,2) not null,
  fecha date not null default current_date,
  concepto text,
  created_at timestamptz default now()
);

-- Compatibilidad con bases existentes donde repartos_evento ya existia sin fecha/concepto
alter table public.repartos_evento
  add column if not exists fecha date,
  add column if not exists concepto text;

update public.repartos_evento
set fecha = coalesce(fecha, (created_at::date), current_date)
where fecha is null;

alter table public.repartos_evento
  alter column fecha set default current_date,
  alter column fecha set not null;

-- ============================================================================
-- QUIEN TRABAJO EN CADA EVENTO
-- ============================================================================

create table if not exists public.evento_trabajadores (
  evento_id uuid not null references public.eventos(id) on delete cascade,
  socio_id uuid not null references public.profiles(id),
  created_at timestamptz default now(),
  primary key (evento_id, socio_id)
);

-- ============================================================================
-- FONDO DE EMPRESA (movimientos del fondo común)
-- ============================================================================

create table if not exists public.fondo_movimientos (
  id uuid primary key default uuid_generate_v4(),
  fecha date not null default current_date,
  concepto text not null,
  cantidad numeric(10,2) not null,  -- positivo = entrada, negativo = salida
  evento_id uuid references public.eventos(id) on delete set null,
  gasto_id uuid references public.gastos(id) on delete set null,
  created_at timestamptz default now()
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

-- Eventos
create index if not exists idx_eventos_fecha on public.eventos (fecha desc);
create index if not exists idx_eventos_estado_financiero on public.eventos (estado_financiero);
create index if not exists idx_eventos_estado_trabajo on public.eventos (estado_trabajo);
create index if not exists idx_eventos_created_by on public.eventos (created_by);

-- Pagos evento
create index if not exists idx_pagos_evento_evento_id on public.pagos_evento (evento_id);
create index if not exists idx_pagos_evento_fecha on public.pagos_evento (fecha desc);

-- Gastos
create index if not exists idx_gastos_fecha on public.gastos (fecha desc);
create index if not exists idx_gastos_evento_id on public.gastos (evento_id);
create index if not exists idx_gastos_categoria on public.gastos (categoria);
create index if not exists idx_gastos_tipo_gasto on public.gastos (tipo_gasto);
create index if not exists idx_gastos_pagado_por on public.gastos (pagado_por);
create index if not exists idx_gastos_reembolsado on public.gastos (reembolsado);

create index if not exists idx_gasto_pagos_gasto_id on public.gasto_pagos (gasto_id);
create index if not exists idx_gasto_pagos_socio_id on public.gasto_pagos (socio_id);
create unique index if not exists uq_gasto_pagos_gasto_fuente
  on public.gasto_pagos (gasto_id, coalesce(socio_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Repartos
create index if not exists idx_repartos_evento_evento_id on public.repartos_evento (evento_id);
create index if not exists idx_repartos_evento_socio_id on public.repartos_evento (socio_id);
create index if not exists idx_repartos_evento_fecha on public.repartos_evento (fecha desc);

-- Trabajadores
create index if not exists idx_evento_trabajadores_evento_id on public.evento_trabajadores (evento_id);
create index if not exists idx_evento_trabajadores_socio_id on public.evento_trabajadores (socio_id);

-- Fondo movimientos
create index if not exists idx_fondo_movimientos_fecha on public.fondo_movimientos (fecha desc);
create index if not exists idx_fondo_movimientos_evento_id on public.fondo_movimientos (evento_id);
create index if not exists idx_fondo_movimientos_gasto_id on public.fondo_movimientos (gasto_id);

-- ============================================================================
-- TRIGGERS (updated_at)
-- ============================================================================

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_eventos_updated on public.eventos;
create trigger trg_eventos_updated
  before update on public.eventos
  for each row
  execute function public.update_updated_at();

drop trigger if exists trg_gastos_updated on public.gastos;
create trigger trg_gastos_updated
  before update on public.gastos
  for each row
  execute function public.update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.eventos enable row level security;
alter table public.pagos_evento enable row level security;
alter table public.gastos enable row level security;
alter table public.repartos_evento enable row level security;
alter table public.fondo_movimientos enable row level security;
alter table public.evento_trabajadores enable row level security;
alter table public.gasto_pagos enable row level security;

-- Políticas: cualquier usuario autenticado puede leer y escribir
-- (colectivo pequeño, sin separación por tenants)

drop policy if exists authenticated_all on public.profiles;
drop policy if exists authenticated_all on public.eventos;
drop policy if exists authenticated_all on public.pagos_evento;
drop policy if exists authenticated_all on public.gastos;
drop policy if exists authenticated_all on public.repartos_evento;
drop policy if exists authenticated_all on public.fondo_movimientos;
drop policy if exists authenticated_all on public.evento_trabajadores;
drop policy if exists authenticated_all on public.gasto_pagos;

create policy authenticated_all on public.profiles
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy authenticated_all on public.eventos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy authenticated_all on public.pagos_evento
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy authenticated_all on public.gastos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy authenticated_all on public.repartos_evento
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy authenticated_all on public.fondo_movimientos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy authenticated_all on public.evento_trabajadores
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy authenticated_all on public.gasto_pagos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================================
-- FUNCIONES RPC (operaciones atómicas)
-- ============================================================================

-- Sincroniza quienes trabajaron fisicamente un evento
create or replace function public.sync_evento_trabajadores(
  p_evento_id uuid,
  p_socios uuid[]
)
returns void
language plpgsql
security definer
as $$
begin
  delete from public.evento_trabajadores et
  where et.evento_id = p_evento_id
    and not (et.socio_id = any (coalesce(p_socios, array[]::uuid[])));

  insert into public.evento_trabajadores (evento_id, socio_id)
  select p_evento_id, s
  from unnest(coalesce(p_socios, array[]::uuid[])) as s
  on conflict (evento_id, socio_id) do nothing;
end;
$$;

-- Registra una nueva tanda de reparto (acumulativo, no sobrescribe)
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
  v_aporte_fondo numeric;
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

  -- Neto repartible facturable: bruto -> quitar IVA 21% -> aplicar IRPF sobre base
  select
    (case
      when v_evento.con_factura then (v_evento.presupuesto / 1.21)
      else v_evento.presupuesto
    end)
    - (case
      when v_evento.con_factura then ((v_evento.presupuesto / 1.21) * coalesce(v_evento.retencion_irpf, 0) / 100)
      else 0
    end)
    - coalesce((select sum(g.cantidad) from public.gastos g where g.evento_id = p_evento_id), 0)
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
    raise exception 'La tanda (%.2f) supera lo pendiente (%.2f)', v_tanda, v_restante;
  end if;

  insert into public.repartos_evento (evento_id, socio_id, cantidad, fecha, concepto)
  select
    p_evento_id,
    nullif(elem->>'socio_id', '')::uuid,
    (elem->>'cantidad')::numeric,
    coalesce(p_fecha, current_date),
    nullif(trim(coalesce(p_concepto, '')), '')
  from jsonb_array_elements(p_repartos) elem
  where coalesce((elem->>'cantidad')::numeric, 0) > 0;

  select coalesce(sum((elem->>'cantidad')::numeric), 0)
  into v_aporte_fondo
  from jsonb_array_elements(p_repartos) elem
  where (elem->>'socio_id') is null
    and coalesce((elem->>'cantidad')::numeric, 0) > 0;

  if v_aporte_fondo > 0 then
    insert into public.fondo_movimientos (fecha, concepto, cantidad, evento_id)
    values (
      coalesce(p_fecha, current_date),
      coalesce(
        nullif(trim(coalesce(p_concepto, '')), ''),
        'Reparto a fondo del evento "' || coalesce(v_evento.nombre, p_evento_id::text) || '"'
      ),
      v_aporte_fondo,
      p_evento_id
    );
  end if;
end;
$$;

-- Resumen de carga de trabajo por socio y rango de fechas
create or replace view public.v_eventos_trabajados_por_socio as
select
  et.socio_id,
  p.nombre as socio_nombre,
  e.fecha,
  et.evento_id,
  e.nombre as evento_nombre
from public.evento_trabajadores et
join public.eventos e on e.id = et.evento_id
join public.profiles p on p.id = et.socio_id;

create or replace function public.resumen_trabajo_socios(
  p_fecha_desde date default null,
  p_fecha_hasta date default null
)
returns table (
  socio_id uuid,
  socio_nombre text,
  eventos_trabajados bigint
)
language sql
security definer
as $$
  select
    v.socio_id,
    v.socio_nombre,
    count(*)::bigint as eventos_trabajados
  from public.v_eventos_trabajados_por_socio v
  where (p_fecha_desde is null or v.fecha >= p_fecha_desde)
    and (p_fecha_hasta is null or v.fecha <= p_fecha_hasta)
  group by v.socio_id, v.socio_nombre
  order by eventos_trabajados desc, v.socio_nombre asc;
$$;

-- Función para reembolsar un gasto (marca como reembolsado + registra movimiento en fondo)
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
  
  update public.gastos set reembolsado = true, updated_at = now() where id = p_gasto_id;
  
  insert into public.fondo_movimientos (fecha, concepto, cantidad, gasto_id)
  values (
    p_fecha,
    'Reembolso a socios: ' || v_gasto.concepto,
    -v_total_socios,
    p_gasto_id
  );
end;
$$;

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

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Para verificar que todo se creó correctamente, ejecuta:
-- select table_name from information_schema.tables where table_schema = 'public' order by table_name;
-- select count(*) from eventos;
-- select count(*) from pagos_evento;
-- select count(*) from gastos;
-- select count(*) from repartos_evento;
-- select count(*) from fondo_movimientos;

-- ============================================================================
-- ESQUEMA COMPLETADO
-- ============================================================================
