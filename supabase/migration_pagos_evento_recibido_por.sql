alter table public.pagos_evento add column if not exists recibido_por uuid references public.profiles(id);
alter table public.pagos_evento add column if not exists metodo_pago text default 'banco'
  check (metodo_pago in ('efectivo', 'banco'));

create or replace function public.cambiar_pagador_masivo(
  p_gasto_ids uuid[],
  p_socio_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_gasto_id uuid;
begin
  foreach v_gasto_id in array p_gasto_ids loop
    delete from public.gasto_pagos where gasto_id = v_gasto_id;

    insert into public.gasto_pagos (gasto_id, socio_id, cantidad)
    select v_gasto_id, p_socio_id, cantidad
    from public.gastos
    where id = v_gasto_id;
  end loop;
end;
$$;

create or replace function public.cambiar_receptor_masivo(
  p_pago_ids uuid[],
  p_socio_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update public.pagos_evento
  set recibido_por = p_socio_id
  where id = any(p_pago_ids);
end;
$$;