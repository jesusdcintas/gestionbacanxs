begin;

alter table public.fondo_movimientos
  add column if not exists reparto_id uuid references public.repartos_evento(id) on delete cascade;

create index if not exists idx_fondo_movimientos_reparto_id
  on public.fondo_movimientos (reparto_id);

with repartos_fondo as (
  select
    r.id as reparto_id,
    r.evento_id,
    r.fecha,
    r.cantidad,
    coalesce(
      nullif(trim(coalesce(r.concepto, '')), ''),
      'Reparto a fondo del evento "' || coalesce(e.nombre, r.evento_id::text) || '"'
    ) as concepto_norm,
    row_number() over (
      partition by r.evento_id, r.fecha, r.cantidad,
      coalesce(nullif(trim(coalesce(r.concepto, '')), ''), 'Reparto a fondo del evento "' || coalesce(e.nombre, r.evento_id::text) || '"')
      order by r.created_at asc, r.id asc
    ) as rn
  from public.repartos_evento r
  left join public.eventos e on e.id = r.evento_id
  where r.socio_id is null
),
movimientos_fondo as (
  select
    fm.id as movimiento_id,
    fm.evento_id,
    fm.fecha,
    fm.cantidad,
    fm.concepto,
    row_number() over (
      partition by fm.evento_id, fm.fecha, fm.cantidad, fm.concepto
      order by fm.created_at asc, fm.id asc
    ) as rn
  from public.fondo_movimientos fm
  where fm.cantidad > 0
    and fm.reparto_id is null
)
update public.fondo_movimientos fm
set reparto_id = rf.reparto_id
from movimientos_fondo mf
join repartos_fondo rf
  on rf.evento_id = mf.evento_id
 and rf.fecha = mf.fecha
 and rf.cantidad = mf.cantidad
 and rf.concepto_norm = mf.concepto
 and rf.rn = mf.rn
where fm.id = mf.movimiento_id
  and fm.reparto_id is null;

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

  with inserted_repartos as (
    insert into public.repartos_evento (evento_id, socio_id, cantidad, fecha, concepto)
    select
      p_evento_id,
      nullif(elem->>'socio_id', '')::uuid,
      (elem->>'cantidad')::numeric,
      coalesce(p_fecha, current_date),
      nullif(trim(coalesce(p_concepto, '')), '')
    from jsonb_array_elements(p_repartos) elem
    where coalesce((elem->>'cantidad')::numeric, 0) > 0
    returning id, evento_id, socio_id, cantidad, fecha, concepto
  )
  insert into public.fondo_movimientos (fecha, concepto, cantidad, evento_id, reparto_id)
  select
    ir.fecha,
    coalesce(
      nullif(trim(coalesce(ir.concepto, '')), ''),
      'Reparto a fondo del evento "' || coalesce(v_evento.nombre, p_evento_id::text) || '"'
    ),
    ir.cantidad,
    ir.evento_id,
    ir.id
  from inserted_repartos ir
  where ir.socio_id is null
    and ir.cantidad > 0;
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
declare
  v_reparto record;
  v_evento_nombre text;
  v_concepto_prev text;
  v_concepto_nuevo text;
  v_movimiento_id uuid;
begin
  select r.*
  into v_reparto
  from public.repartos_evento r
  where r.id = p_reparto_id
  for update;

  if not found then
    raise exception 'Reparto no encontrado';
  end if;

  update public.repartos_evento
  set
    fecha = p_fecha,
    concepto = p_concepto,
    cantidad = p_cantidad
  where id = p_reparto_id;

  if v_reparto.socio_id is null then
    select e.nombre into v_evento_nombre
    from public.eventos e
    where e.id = v_reparto.evento_id;

    v_concepto_prev := coalesce(
      nullif(trim(coalesce(v_reparto.concepto, '')), ''),
      'Reparto a fondo del evento "' || coalesce(v_evento_nombre, v_reparto.evento_id::text) || '"'
    );

    v_concepto_nuevo := coalesce(
      nullif(trim(coalesce(p_concepto, '')), ''),
      'Reparto a fondo del evento "' || coalesce(v_evento_nombre, v_reparto.evento_id::text) || '"'
    );

    select fm.id
    into v_movimiento_id
    from public.fondo_movimientos fm
    where fm.reparto_id = p_reparto_id
      and fm.cantidad > 0
    order by fm.created_at desc
    limit 1;

    if v_movimiento_id is null then
      select fm.id
      into v_movimiento_id
      from public.fondo_movimientos fm
      where fm.evento_id = v_reparto.evento_id
        and fm.cantidad = v_reparto.cantidad
        and fm.fecha = v_reparto.fecha
        and fm.concepto = v_concepto_prev
        and fm.cantidad > 0
      order by fm.created_at desc
      limit 1;
    end if;

    if v_movimiento_id is not null then
      update public.fondo_movimientos
      set
        fecha = p_fecha,
        concepto = v_concepto_nuevo,
        cantidad = p_cantidad,
        reparto_id = p_reparto_id
      where id = v_movimiento_id;
    end if;
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
declare
  v_reparto record;
  v_evento_nombre text;
  v_concepto_prev text;
  v_movimiento_id uuid;
begin
  select r.*
  into v_reparto
  from public.repartos_evento r
  where r.id = p_reparto_id
  for update;

  if not found then
    raise exception 'Reparto no encontrado';
  end if;

  if v_reparto.socio_id is null then
    select e.nombre into v_evento_nombre
    from public.eventos e
    where e.id = v_reparto.evento_id;

    v_concepto_prev := coalesce(
      nullif(trim(coalesce(v_reparto.concepto, '')), ''),
      'Reparto a fondo del evento "' || coalesce(v_evento_nombre, v_reparto.evento_id::text) || '"'
    );

    select fm.id
    into v_movimiento_id
    from public.fondo_movimientos fm
    where fm.reparto_id = p_reparto_id
      and fm.cantidad > 0
    order by fm.created_at desc
    limit 1;

    if v_movimiento_id is null then
      select fm.id
      into v_movimiento_id
      from public.fondo_movimientos fm
      where fm.evento_id = v_reparto.evento_id
        and fm.cantidad = v_reparto.cantidad
        and fm.fecha = v_reparto.fecha
        and fm.concepto = v_concepto_prev
        and fm.cantidad > 0
      order by fm.created_at desc
      limit 1;
    end if;

    if v_movimiento_id is not null then
      delete from public.fondo_movimientos
      where id = v_movimiento_id;
    end if;
  end if;

  delete from public.repartos_evento
  where id = p_reparto_id;
end;
$$;

commit;
