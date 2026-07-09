begin;

-- 1) Asegurar que al eliminar un reparto (o su evento) se elimine también
--    su movimiento de fondo vinculado por reparto_id.
do $$
declare
  v_constraint text;
begin
  select tc.constraint_name
  into v_constraint
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
   and tc.table_name = kcu.table_name
  where tc.table_schema = 'public'
    and tc.table_name = 'fondo_movimientos'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'reparto_id'
  limit 1;

  if v_constraint is not null then
    execute format('alter table public.fondo_movimientos drop constraint %I', v_constraint);
  end if;
end $$;

alter table public.fondo_movimientos
  add constraint fondo_movimientos_reparto_id_fkey
  foreign key (reparto_id)
  references public.repartos_evento(id)
  on delete cascade;

-- 2) Limpiar huérfanos históricos ya existentes por borrados antiguos de eventos.
--    Son entradas de reparto a fondo sin evento y sin reparto asociado.
delete from public.fondo_movimientos fm
where fm.cantidad > 0
  and fm.evento_id is null
  and fm.reparto_id is null
  and fm.concepto like 'Reparto a fondo del evento %';

commit;
