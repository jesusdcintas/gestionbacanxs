-- Eventos
create table if not exists eventos (
  id              uuid primary key default uuid_generate_v4(),
  nombre          text not null,
  fecha           date,
  lugar           text,
  cliente         text,
  presupuesto     numeric(10,2) not null default 0,
  con_factura     boolean default false,
  retencion_irpf  numeric(5,2) default 20.00,
  estado          text default 'pendiente' check (estado in ('pendiente','confirmado','completado','cancelado')),
  observaciones   text,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Pagos recibidos de un evento (1 a N por evento)
create table if not exists pagos_evento (
  id          uuid primary key default uuid_generate_v4(),
  evento_id   uuid not null references eventos(id) on delete cascade,
  fecha       date not null,
  cantidad    numeric(10,2) not null check (cantidad > 0),
  concepto    text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz default now()
);

-- Gastos (de evento o generales de empresa)
create table if not exists gastos (
  id          uuid primary key default uuid_generate_v4(),
  concepto    text not null,
  cantidad    numeric(10,2) not null check (cantidad > 0),
  categoria   text not null,
  fecha       date not null,
  evento_id   uuid references eventos(id) on delete set null,
  pagado_por  uuid references profiles(id),       -- null = pagado directamente por la empresa/fondo
  reembolsado boolean default false,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Reparto del neto repartible de cada evento
create table if not exists repartos_evento (
  id          uuid primary key default uuid_generate_v4(),
  evento_id   uuid not null references eventos(id) on delete cascade,
  socio_id    uuid references profiles(id),        -- null = fondo de empresa
  cantidad    numeric(10,2) not null,
  created_at  timestamptz default now()
);

-- Movimientos del fondo de empresa
create table if not exists fondo_movimientos (
  id          uuid primary key default uuid_generate_v4(),
  fecha       date not null default current_date,
  concepto    text not null,
  cantidad    numeric(10,2) not null,    -- positivo = entrada, negativo = salida
  evento_id   uuid references eventos(id) on delete set null,
  gasto_id    uuid references gastos(id) on delete set null,
  created_at  timestamptz default now()
);

-- RLS
alter table eventos            enable row level security;
alter table pagos_evento       enable row level security;
alter table gastos             enable row level security;
alter table repartos_evento    enable row level security;
alter table fondo_movimientos  enable row level security;

create policy "authenticated_all" on eventos           for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on pagos_evento       for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on gastos             for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on repartos_evento    for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on fondo_movimientos  for all using (auth.role() = 'authenticated');

-- Trigger updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_eventos_updated before update on eventos for each row execute function update_updated_at();
create trigger trg_gastos_updated  before update on gastos  for each row execute function update_updated_at();
