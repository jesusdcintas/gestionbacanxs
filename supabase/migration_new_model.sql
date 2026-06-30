-- Gestor Bacanxs - Migración al modelo financiero refinado
-- Este script migra de:
--   eventos (precio, cobrado, pagado) + ingresos + gastos
-- Hacia:
--   eventos (presupuesto, con_factura, retencion_irpf, estado) + pagos_evento + gastos (con pagado_por, reembolsado) + repartos_evento + fondo_movimientos

-- ADVERTENCIAS:
-- 1. La tabla "ingresos" será eliminada. Sus datos se pueden migrar parcialmente a "pagos_evento" si existen.
-- 2. Los campos "cobrado" y "pagado" de eventos se eliminarán (reemplazados por el nuevo campo "estado").
-- 3. Los gastos existentes se conservan, pero se añaden nuevos campos (pagado_por, reembolsado).

-- ============================================================================
-- PASO 1: BACKUP de datos existentes (opcional, recomendado)
-- ============================================================================
-- Descomenta estas líneas si quieres hacer backup antes de migrar:
-- create table if not exists eventos_backup as select * from eventos;
-- create table if not exists ingresos_backup as select * from ingresos;
-- create table if not exists gastos_backup as select * from gastos;

-- ============================================================================
-- PASO 2: MIGRACIÓN DE TABLA "eventos"
-- ============================================================================

-- Renombrar "precio" a "presupuesto"
alter table public.eventos rename column precio to presupuesto;

-- Añadir nuevos campos
alter table public.eventos 
  add column if not exists con_factura boolean default false,
  add column if not exists retencion_irpf numeric(5,2) default 20.00,
  add column if not exists estado text default 'pendiente';

-- Migrar el estado basado en los campos antiguos
-- Si "cobrado" era true, consideramos el evento como "completado", si no, "pendiente"
update public.eventos 
set estado = case 
  when cobrado = true then 'completado'
  else 'pendiente'
end
where estado = 'pendiente';  -- solo actualizar los que tienen el valor por defecto

-- Añadir constraint al campo estado
alter table public.eventos 
  add constraint eventos_estado_check 
  check (estado in ('pendiente','confirmado','completado','cancelado'));

-- Eliminar campos antiguos (cobrado, pagado)
alter table public.eventos 
  drop column if exists cobrado,
  drop column if exists pagado;

-- Actualizar índices
drop index if exists idx_eventos_cobrado;
drop index if exists idx_eventos_pagado;
create index if not exists idx_eventos_estado on public.eventos (estado);

-- ============================================================================
-- PASO 3: CREAR TABLA "pagos_evento" (pagos recibidos del cliente)
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

create index if not exists idx_pagos_evento_evento_id on public.pagos_evento (evento_id);
create index if not exists idx_pagos_evento_fecha on public.pagos_evento (fecha desc);

-- Política RLS para pagos_evento
alter table public.pagos_evento enable row level security;
create policy authenticated_all on public.pagos_evento
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- MIGRACIÓN DE DATOS: Convertir "ingresos" ligados a eventos en "pagos_evento"
-- Solo migramos los ingresos que tienen evento_id asociado
insert into public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by, created_at)
select 
  evento_id,
  fecha,
  cantidad,
  concepto,
  created_by,
  created_at
from public.ingresos
where evento_id is not null;

-- ============================================================================
-- PASO 4: ACTUALIZAR TABLA "gastos"
-- ============================================================================

-- Añadir nuevos campos a gastos
alter table public.gastos
  add column if not exists pagado_por uuid references public.profiles(id),
  add column if not exists reembolsado boolean default false;

-- Por defecto, los gastos existentes se consideran pagados por la empresa (pagado_por = null)
-- y no reembolsados (ya que no existía ese concepto antes)

create index if not exists idx_gastos_pagado_por on public.gastos (pagado_por);
create index if not exists idx_gastos_reembolsado on public.gastos (reembolsado);

-- ============================================================================
-- PASO 5: CREAR TABLA "repartos_evento" (cómo se reparte el neto de cada evento)
-- ============================================================================

create table if not exists public.repartos_evento (
  id uuid primary key default uuid_generate_v4(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  socio_id uuid references public.profiles(id),  -- null = fondo de empresa
  cantidad numeric(10,2) not null,
  created_at timestamptz default now()
);

create index if not exists idx_repartos_evento_evento_id on public.repartos_evento (evento_id);
create index if not exists idx_repartos_evento_socio_id on public.repartos_evento (socio_id);

-- Política RLS para repartos_evento
alter table public.repartos_evento enable row level security;
create policy authenticated_all on public.repartos_evento
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================================
-- PASO 6: CREAR TABLA "fondo_movimientos" (movimientos del fondo de empresa)
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

create index if not exists idx_fondo_movimientos_fecha on public.fondo_movimientos (fecha desc);
create index if not exists idx_fondo_movimientos_evento_id on public.fondo_movimientos (evento_id);
create index if not exists idx_fondo_movimientos_gasto_id on public.fondo_movimientos (gasto_id);

-- Política RLS para fondo_movimientos
alter table public.fondo_movimientos enable row level security;
create policy authenticated_all on public.fondo_movimientos
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================================
-- PASO 7: ELIMINAR TABLA "ingresos" (ya migrada a pagos_evento)
-- ============================================================================

-- CUIDADO: Esto eliminará la tabla ingresos y todos sus datos.
-- Los ingresos ligados a eventos ya fueron migrados a pagos_evento.
-- Los ingresos SIN evento_id se perderán (eran ingresos generales no ligados a un bolo específico).

drop table if exists public.ingresos cascade;

-- ============================================================================
-- PASO 8: FUNCIÓN RPC para guardar reparto de manera atómica
-- ============================================================================

-- Esta función borra los repartos anteriores de un evento y guarda los nuevos
-- en una sola transacción, garantizando atomicidad.
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

-- ============================================================================
-- PASO 9: FUNCIÓN RPC para reembolsar un gasto (actualiza gasto + registra movimiento fondo)
-- ============================================================================

-- Esta función marca un gasto como reembolsado y registra el movimiento de salida
-- del fondo de empresa en una transacción atómica.
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
  update public.gastos set reembolsado = true where id = p_gasto_id;
  
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
-- RESUMEN DE LA MIGRACIÓN
-- ============================================================================
-- ✓ eventos: precio → presupuesto, añadidos con_factura, retencion_irpf, estado
-- ✓ pagos_evento: nueva tabla creada, datos migrados desde ingresos con evento_id
-- ✓ gastos: añadidos pagado_por, reembolsado
-- ✓ repartos_evento: nueva tabla creada
-- ✓ fondo_movimientos: nueva tabla creada
-- ✓ ingresos: tabla eliminada (datos migrados a pagos_evento)
-- ✓ Funciones RPC: guardar_reparto_evento, reembolsar_gasto

-- Para verificar que todo funcionó correctamente:
-- select count(*) from eventos;
-- select count(*) from pagos_evento;
-- select count(*) from gastos;
-- select count(*) from repartos_evento;
-- select count(*) from fondo_movimientos;
