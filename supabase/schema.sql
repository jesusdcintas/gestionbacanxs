-- Gestor Bacanxs - Schema completo para Supabase
-- Ejecutar en el SQL Editor de Supabase

-- Extensiones
create extension if not exists "uuid-ossp";

-- Profiles (1:1 con auth.users)
create table if not exists public.profiles (
  id uuid primary key,
  nombre text not null,
  created_at timestamptz default now()
);

-- Eventos
create table if not exists public.eventos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  fecha date,
  lugar text,
  cliente text,
  precio numeric(10,2) default 0,
  cobrado boolean default false,
  pagado boolean default false,
  observaciones text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ingresos
create table if not exists public.ingresos (
  id uuid primary key default uuid_generate_v4(),
  concepto text not null,
  cantidad numeric(10,2) not null check (cantidad > 0),
  fecha date not null,
  evento_id uuid references public.eventos(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Gastos
create table if not exists public.gastos (
  id uuid primary key default uuid_generate_v4(),
  concepto text not null,
  cantidad numeric(10,2) not null check (cantidad > 0),
  categoria text not null,
  fecha date not null,
  evento_id uuid references public.eventos(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices útiles
create index if not exists idx_eventos_fecha on public.eventos (fecha desc);
create index if not exists idx_eventos_cobrado on public.eventos (cobrado);
create index if not exists idx_eventos_pagado on public.eventos (pagado);
create index if not exists idx_ingresos_fecha on public.ingresos (fecha desc);
create index if not exists idx_ingresos_evento_id on public.ingresos (evento_id);
create index if not exists idx_gastos_fecha on public.gastos (fecha desc);
create index if not exists idx_gastos_evento_id on public.gastos (evento_id);
create index if not exists idx_gastos_categoria on public.gastos (categoria);

-- Trigger genérico updated_at
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger para crear profile automáticamente al crear un usuario en auth.users
-- Disparadores para updated_at
drop trigger if exists trg_eventos_updated on public.eventos;
create trigger trg_eventos_updated
before update on public.eventos
for each row
execute function public.update_updated_at();

drop trigger if exists trg_ingresos_updated on public.ingresos;
create trigger trg_ingresos_updated
before update on public.ingresos
for each row
execute function public.update_updated_at();

drop trigger if exists trg_gastos_updated on public.gastos;
create trigger trg_gastos_updated
before update on public.gastos
for each row
execute function public.update_updated_at();

-- Disparador para autocrear profile
drop trigger if exists on_auth_user_created on auth.users;

-- RLS
alter table public.profiles enable row level security;
alter table public.eventos enable row level security;
alter table public.ingresos enable row level security;
alter table public.gastos enable row level security;

-- Políticas: cualquier usuario autenticado puede leer y escribir
-- El esquema está pensado para un colectivo pequeño sin separación por tenants.
drop policy if exists authenticated_all on public.profiles;
drop policy if exists authenticated_all on public.eventos;
drop policy if exists authenticated_all on public.ingresos;
drop policy if exists authenticated_all on public.gastos;

create policy authenticated_all on public.profiles
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy authenticated_all on public.eventos
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy authenticated_all on public.ingresos
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy authenticated_all on public.gastos
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

-- Datos base opcionales: deja un profile manual de ejemplo si lo necesitas.
-- insert into public.profiles (id, nombre)
-- values ('00000000-0000-0000-0000-000000000000', 'Bujía')
-- on conflict (id) do nothing;
