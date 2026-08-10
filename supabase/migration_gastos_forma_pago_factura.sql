begin;

-- --------------------------------------------------------------------------
-- 1) Nuevas columnas en gastos
-- --------------------------------------------------------------------------
alter table public.gastos add column if not exists forma_pago text;
alter table public.gastos add column if not exists tipo_factura text;
alter table public.gastos add column if not exists factura_path text;

alter table public.gastos drop constraint if exists gastos_forma_pago_check;
alter table public.gastos add constraint gastos_forma_pago_check
  check (forma_pago in ('tarjeta', 'transferencia', 'efectivo') or forma_pago is null);

alter table public.gastos drop constraint if exists gastos_tipo_factura_check;
alter table public.gastos add constraint gastos_tipo_factura_check
  check (tipo_factura in ('A', 'B') or tipo_factura is null);

-- --------------------------------------------------------------------------
-- 2) Storage privado de facturas (10MB, PDF/JPG/PNG)
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'facturas',
  'facturas',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
declare
  v_owner name;
begin
  select pg_get_userbyid(c.relowner)
  into v_owner
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage'
    and c.relname = 'objects';

  if v_owner = current_user then
    execute 'alter table storage.objects enable row level security';

    execute 'drop policy if exists facturas_authenticated_select on storage.objects';
    execute 'drop policy if exists facturas_authenticated_insert on storage.objects';
    execute 'drop policy if exists facturas_authenticated_update on storage.objects';
    execute 'drop policy if exists facturas_authenticated_delete on storage.objects';

    execute $p$
      create policy facturas_authenticated_select
      on storage.objects
      for select
      to authenticated
      using (bucket_id = 'facturas')
    $p$;

    execute $p$
      create policy facturas_authenticated_insert
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'facturas')
    $p$;

    execute $p$
      create policy facturas_authenticated_update
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'facturas')
      with check (bucket_id = 'facturas')
    $p$;

    execute $p$
      create policy facturas_authenticated_delete
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'facturas')
    $p$;
  else
    raise notice 'No se aplicaron policies de storage.objects: current_user (%) no es owner (%). Configúralas desde Dashboard > Storage > Policies.', current_user, v_owner;
  end if;
end
$$;

-- --------------------------------------------------------------------------
-- 3) RPC guardar_gasto_con_pagos extendida
-- --------------------------------------------------------------------------
create or replace function public.guardar_gasto_con_pagos(
  p_gasto_id uuid,
  p_concepto text,
  p_cantidad numeric,
  p_categoria text,
  p_tipo_gasto text,
  p_fecha date,
  p_evento_id uuid,
  p_reembolsado boolean,
  p_forma_pago text,
  p_tipo_factura text,
  p_factura_path text,
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
  v_forma_pago text;
  v_tipo_factura text;
  v_total_fondo numeric(10,2);
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad del gasto debe ser mayor a 0';
  end if;

  v_tipo_gasto := coalesce(nullif(trim(p_tipo_gasto), ''), 'directo_evento');
  v_forma_pago := nullif(trim(coalesce(p_forma_pago, '')), '');
  v_tipo_factura := nullif(trim(coalesce(p_tipo_factura, '')), '');

  if v_tipo_gasto not in ('directo_evento', 'inversion_empresa') then
    raise exception 'Tipo de gasto no válido';
  end if;

  if v_forma_pago is not null and v_forma_pago not in ('tarjeta', 'transferencia', 'efectivo') then
    raise exception 'Forma de pago no válida';
  end if;

  if v_tipo_factura is not null and v_tipo_factura not in ('A', 'B') then
    raise exception 'Tipo de factura no válido';
  end if;

  if v_tipo_gasto = 'directo_evento' and p_evento_id is null then
    raise exception 'Los gastos directos de evento deben tener evento_id';
  end if;

  if v_tipo_gasto = 'inversion_empresa' and (p_fuentes is null or jsonb_typeof(p_fuentes) <> 'array' or jsonb_array_length(p_fuentes) = 0) then
    raise exception 'Debes enviar al menos una fuente de pago';
  end if;

  select coalesce(sum((x.value->>'cantidad')::numeric), 0)
  into v_suma_fuentes
  from jsonb_array_elements(coalesce(p_fuentes, '[]'::jsonb)) x
  where coalesce((x.value->>'cantidad')::numeric, 0) > 0;

  if v_tipo_gasto = 'inversion_empresa' and abs(v_suma_fuentes - p_cantidad) > 0.01 then
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
      forma_pago,
      tipo_factura,
      factura_path,
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
      v_forma_pago,
      v_tipo_factura,
      nullif(trim(coalesce(p_factura_path, '')), ''),
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
      forma_pago = v_forma_pago,
      tipo_factura = v_tipo_factura,
      factura_path = nullif(trim(coalesce(p_factura_path, '')), ''),
      updated_at = now()
    where id = p_gasto_id;

    if not found then
      raise exception 'Gasto no encontrado';
    end if;

    v_gasto_id := p_gasto_id;

    delete from public.gasto_pagos where gasto_id = v_gasto_id;
  end if;

  delete from public.fondo_movimientos
  where gasto_id = v_gasto_id
    and cantidad < 0
    and coalesce(concepto, '') not like 'Reembolso a socios:%'
    and coalesce(concepto, '') not like 'Reembolso a socio:%';

  insert into public.gasto_pagos (gasto_id, socio_id, cantidad)
  select
    v_gasto_id,
    nullif(value->>'socio_id', '')::uuid,
    (value->>'cantidad')::numeric
  from jsonb_array_elements(coalesce(p_fuentes, '[]'::jsonb))
  where coalesce((value->>'cantidad')::numeric, 0) > 0;

  select coalesce(sum(gp.cantidad), 0)
  into v_total_fondo
  from public.gasto_pagos gp
  where gp.gasto_id = v_gasto_id
    and gp.socio_id is null;

  if v_total_fondo > 0 then
    insert into public.fondo_movimientos (fecha, concepto, cantidad, evento_id, gasto_id)
    values (
      coalesce(p_fecha, current_date),
      p_concepto,
      -v_total_fondo,
      p_evento_id,
      v_gasto_id
    );
  end if;

  return v_gasto_id;
end;
$$;

commit;
