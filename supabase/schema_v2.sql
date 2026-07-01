-- Gestor Bacanxs - Esquema V2 (Modelo Financiero Refinado)
-- Ejecutar en el SQL Editor de Supabase
-- Este esquema reemplaza completamente el anterior

-- ============================================================================
-- LIMPIEZA (si es necesario volver a ejecutar)
-- ============================================================================

-- Descomenta estas líneas si necesitas limpiar y empezar de cero:
-- drop table if exists public.fondo_movimientos cascade;
-- drop table if exists public.repartos_evento cascade;
-- drop table if exists public.pagos_evento cascade;
-- drop table if exists public.gastos cascade;
-- drop table if exists public.eventos cascade;
-- drop table if exists public.profiles cascade;
-- drop function if exists public.guardar_reparto_evento cascade;
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
  created_at timestamptz default now()
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
create index if not exists idx_gastos_pagado_por on public.gastos (pagado_por);
create index if not exists idx_gastos_reembolsado on public.gastos (reembolsado);

-- Repartos
create index if not exists idx_repartos_evento_evento_id on public.repartos_evento (evento_id);
create index if not exists idx_repartos_evento_socio_id on public.repartos_evento (socio_id);

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

-- Políticas: cualquier usuario autenticado puede leer y escribir
-- (colectivo pequeño, sin separación por tenants)

drop policy if exists authenticated_all on public.profiles;
drop policy if exists authenticated_all on public.eventos;
drop policy if exists authenticated_all on public.pagos_evento;
drop policy if exists authenticated_all on public.gastos;
drop policy if exists authenticated_all on public.repartos_evento;
drop policy if exists authenticated_all on public.fondo_movimientos;

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

-- ============================================================================
-- FUNCIONES RPC (operaciones atómicas)
-- ============================================================================

-- Función para guardar reparto de un evento (borra anteriores y guarda nuevos)
create or replace function public.guardar_reparto_evento(
  p_evento_id uuid,
  p_repartos jsonb  -- Array de {socio_id: uuid | null, cantidad: numeric}
)
returns void
language plpgsql
security definer
as $$
begin
  -- Borrar repartos anteriores
  delete from public.repartos_evento where evento_id = p_evento_id;
  
  -- Insertar nuevos repartos
  insert into public.repartos_evento (evento_id, socio_id, cantidad)
  select 
    p_evento_id,
    (value->>'socio_id')::uuid,
    (value->>'cantidad')::numeric
  from jsonb_array_elements(p_repartos);
end;
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
begin
  -- Obtener el gasto
  select * into v_gasto from public.gastos where id = p_gasto_id;
  
  if not found then
    raise exception 'Gasto no encontrado';
  end if;
  
  if v_gasto.pagado_por is null then
    raise exception 'Este gasto fue pagado por la empresa, no requiere reembolso';
  end if;
  
  if v_gasto.reembolsado = true then
    raise exception 'Este gasto ya ha sido reembolsado';
  end if;
  
  -- Marcar como reembolsado
  update public.gastos set reembolsado = true, updated_at = now() where id = p_gasto_id;
  
  -- Registrar movimiento de salida en el fondo
  insert into public.fondo_movimientos (fecha, concepto, cantidad, gasto_id)
  values (
    p_fecha,
    'Reembolso a socio: ' || v_gasto.concepto,
    -v_gasto.cantidad,  -- negativo = salida del fondo
    p_gasto_id
  );
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
