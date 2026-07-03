-- Migracion: trabajadores por evento + repartos acumulativos por tandas
-- IMPORTANTE: revisar y ejecutar manualmente en Supabase SQL Editor (base con datos reales)

begin;

-- ============================================================
-- 1) QUIEN TRABAJO EN CADA EVENTO
-- ============================================================

create table if not exists public.evento_trabajadores (
  evento_id uuid not null references public.eventos(id) on delete cascade,
  socio_id uuid not null references public.profiles(id),
  created_at timestamptz default now(),
  primary key (evento_id, socio_id)
);

create index if not exists idx_evento_trabajadores_evento_id on public.evento_trabajadores (evento_id);
create index if not exists idx_evento_trabajadores_socio_id on public.evento_trabajadores (socio_id);

alter table public.evento_trabajadores enable row level security;
drop policy if exists authenticated_all on public.evento_trabajadores;
create policy authenticated_all on public.evento_trabajadores
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- 2) REPARTOS ACUMULATIVOS (HISTORICO)
-- ============================================================

alter table public.repartos_evento
  add column if not exists fecha date default current_date,
  add column if not exists concepto text;

update public.repartos_evento
set fecha = coalesce(fecha, (created_at::date), current_date)
where fecha is null;

alter table public.repartos_evento
  alter column fecha set default current_date,
  alter column fecha set not null;

create index if not exists idx_repartos_evento_fecha on public.repartos_evento (fecha desc);

-- ============================================================
-- 3) RPC PARA SINCRONIZAR TRABAJADORES DEL EVENTO
-- ============================================================

create or replace function public.sync_evento_trabajadores(
  p_evento_id uuid,
  p_socios uuid[]
)
returns void
language plpgsql
security definer
as $$
begin
  -- Eliminar los que ya no estan seleccionados
  delete from public.evento_trabajadores et
  where et.evento_id = p_evento_id
    and not (et.socio_id = any (coalesce(p_socios, array[]::uuid[])));

  -- Insertar los nuevos
  insert into public.evento_trabajadores (evento_id, socio_id)
  select p_evento_id, s
  from unnest(coalesce(p_socios, array[]::uuid[])) as s
  on conflict (evento_id, socio_id) do nothing;
end;
$$;

-- ============================================================
-- 4) RPC REPARTO ACUMULATIVO (NO SOBRESCRIBE)
-- ============================================================

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
  v_neto_repartible numeric;
  v_ya_repartido numeric;
  v_tanda numeric;
  v_restante numeric;
  v_evento record;
  v_aporte_fondo numeric;
begin
  if p_repartos is null or jsonb_typeof(p_repartos) <> 'array' then
    raise exception 'p_repartos debe ser un array jsonb';
  end if;

  select
    e.id,
    e.nombre,
    e.fecha,
    e.presupuesto,
    e.con_factura,
    e.retencion_irpf
  into v_evento
  from public.eventos e
  where e.id = p_evento_id;

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

  -- Registrar entrada al fondo solo para la parte socio_id = null de esta tanda
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

create or replace function public.editar_reparto(
  p_reparto_id uuid,
  p_fecha date,
  p_concepto text,
  p_cantidad numeric
)
returns void
language plpgsql
security definer
as $$
begin
  update public.repartos_evento
  set fecha = p_fecha,
      concepto = p_concepto,
      cantidad = p_cantidad
  where id = p_reparto_id;

  if not found then
    raise exception 'Reparto no encontrado';
  end if;
end;
$$;

create or replace function public.eliminar_reparto(
  p_reparto_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  delete from public.repartos_evento
  where id = p_reparto_id;

  if not found then
    raise exception 'Reparto no encontrado';
  end if;
end;
$$;

-- ============================================================
-- 5) QUERY REUTILIZABLE DE CARGA DE TRABAJO POR SOCIO
-- ============================================================

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

commit;

-- Verificacion recomendada:
-- select * from public.evento_trabajadores limit 20;
-- select id, evento_id, socio_id, cantidad, fecha, concepto from public.repartos_evento order by fecha desc, created_at desc limit 50;
-- select * from public.resumen_trabajo_socios(null, null);
