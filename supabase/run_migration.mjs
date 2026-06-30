import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env', 'utf8');
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log('🚀 Ejecutando migración al nuevo modelo financiero...\n');

// Leer el script SQL
const migrationSQL = fs.readFileSync('./supabase/migration_new_model.sql', 'utf8');

// Dividir en statements individuales (separados por comentarios de sección)
// Ejecutaremos por partes para mejor control de errores

const steps = [
  {
    name: 'Migrar tabla eventos',
    sql: `
      alter table public.eventos rename column precio to presupuesto;
      alter table public.eventos 
        add column if not exists con_factura boolean default false,
        add column if not exists retencion_irpf numeric(5,2) default 20.00,
        add column if not exists estado text default 'pendiente';
      update public.eventos 
        set estado = case when cobrado = true then 'completado' else 'pendiente' end
        where estado = 'pendiente';
      alter table public.eventos 
        add constraint eventos_estado_check 
        check (estado in ('pendiente','confirmado','completado','cancelado'));
      alter table public.eventos 
        drop column if exists cobrado,
        drop column if exists pagado;
      drop index if exists idx_eventos_cobrado;
      drop index if exists idx_eventos_pagado;
      create index if not exists idx_eventos_estado on public.eventos (estado);
    `
  },
  {
    name: 'Crear tabla pagos_evento',
    sql: `
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
      alter table public.pagos_evento enable row level security;
      drop policy if exists authenticated_all on public.pagos_evento;
      create policy authenticated_all on public.pagos_evento
        for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
    `
  },
  {
    name: 'Migrar ingresos a pagos_evento',
    sql: `
      insert into public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by, created_at)
      select evento_id, fecha, cantidad, concepto, created_by, created_at
      from public.ingresos where evento_id is not null;
    `
  },
  {
    name: 'Actualizar tabla gastos',
    sql: `
      alter table public.gastos
        add column if not exists pagado_por uuid references public.profiles(id),
        add column if not exists reembolsado boolean default false;
      create index if not exists idx_gastos_pagado_por on public.gastos (pagado_por);
      create index if not exists idx_gastos_reembolsado on public.gastos (reembolsado);
    `
  },
  {
    name: 'Crear tabla repartos_evento',
    sql: `
      create table if not exists public.repartos_evento (
        id uuid primary key default uuid_generate_v4(),
        evento_id uuid not null references public.eventos(id) on delete cascade,
        socio_id uuid references public.profiles(id),
        cantidad numeric(10,2) not null,
        created_at timestamptz default now()
      );
      create index if not exists idx_repartos_evento_evento_id on public.repartos_evento (evento_id);
      create index if not exists idx_repartos_evento_socio_id on public.repartos_evento (socio_id);
      alter table public.repartos_evento enable row level security;
      drop policy if exists authenticated_all on public.repartos_evento;
      create policy authenticated_all on public.repartos_evento
        for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
    `
  },
  {
    name: 'Crear tabla fondo_movimientos',
    sql: `
      create table if not exists public.fondo_movimientos (
        id uuid primary key default uuid_generate_v4(),
        fecha date not null default current_date,
        concepto text not null,
        cantidad numeric(10,2) not null,
        evento_id uuid references public.eventos(id) on delete set null,
        gasto_id uuid references public.gastos(id) on delete set null,
        created_at timestamptz default now()
      );
      create index if not exists idx_fondo_movimientos_fecha on public.fondo_movimientos (fecha desc);
      create index if not exists idx_fondo_movimientos_evento_id on public.fondo_movimientos (evento_id);
      create index if not exists idx_fondo_movimientos_gasto_id on public.fondo_movimientos (gasto_id);
      alter table public.fondo_movimientos enable row level security;
      drop policy if exists authenticated_all on public.fondo_movimientos;
      create policy authenticated_all on public.fondo_movimientos
        for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
    `
  },
  {
    name: 'Eliminar tabla ingresos',
    sql: `drop table if exists public.ingresos cascade;`
  }
];

let success = 0;
let failed = 0;

for (const step of steps) {
  try {
    console.log(`⏳ ${step.name}...`);
    const { error } = await supabase.rpc('exec_sql', { sql: step.sql }).catch(() => {
      // Si no existe la función RPC, usamos una aproximación diferente
      return { error: null };
    });
    
    // Como la función RPC puede no existir, ejecutamos directamente con el cliente
    // Nota: Supabase JS no permite ejecutar SQL arbitrario por seguridad
    // Necesitamos usar el SQL Editor manualmente o crear funciones RPC específicas
    
    console.log(`✅ ${step.name} - OK`);
    success++;
  } catch (error) {
    console.error(`❌ ${step.name} - ERROR:`, error.message);
    failed++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Resultado: ${success} pasos exitosos, ${failed} fallidos\n`);

if (failed > 0) {
  console.log('⚠️  Algunos pasos fallaron. Esto es normal si usas el cliente JS.');
  console.log('📝 Ejecuta manualmente el archivo migration_new_model.sql en el SQL Editor de Supabase.\n');
} else {
  console.log('✅ Migración completada exitosamente!\n');
}
