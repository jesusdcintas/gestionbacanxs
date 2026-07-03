create or replace function public.cobrar_y_repartir(
  p_evento_id uuid,
  p_fecha date,
  p_cantidad numeric,
  p_recibido_por uuid,
  p_metodo_pago text,
  p_concepto_pago text,
  p_repartos jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_reparto jsonb;
  v_total_repartos numeric := 0;
  v_metodo_pago text := coalesce(nullif(lower(trim(p_metodo_pago)), ''), 'banco');
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad cobrada debe ser mayor que 0';
  end if;

  if p_recibido_por is null then
    raise exception 'Debes indicar quién cobró el pago';
  end if;

  if v_metodo_pago not in ('efectivo', 'banco') then
    raise exception 'Método de cobro no válido';
  end if;

  insert into public.pagos_evento (
    evento_id,
    fecha,
    cantidad,
    concepto,
    recibido_por,
    metodo_pago
  ) values (
    p_evento_id,
    coalesce(p_fecha, current_date),
    p_cantidad,
    nullif(trim(p_concepto_pago), ''),
    p_recibido_por,
    v_metodo_pago
  );

  if p_repartos is not null and jsonb_typeof(p_repartos) = 'array' then
    select coalesce(sum((item->>'cantidad')::numeric), 0)
    into v_total_repartos
    from jsonb_array_elements(p_repartos) item
    where coalesce((item->>'cantidad')::numeric, 0) > 0;

    if v_total_repartos > p_cantidad + 0.01 then
      raise exception 'La suma del reparto (%.2f) supera la cantidad cobrada (%.2f)', v_total_repartos, p_cantidad;
    end if;

    for v_reparto in select * from jsonb_array_elements(p_repartos)
    loop
      if coalesce((v_reparto->>'cantidad')::numeric, 0) > 0 then
        insert into public.repartos_evento (
          evento_id,
          socio_id,
          cantidad,
          fecha,
          concepto
        ) values (
          p_evento_id,
          nullif(v_reparto->>'socio_id', '')::uuid,
          (v_reparto->>'cantidad')::numeric,
          coalesce(p_fecha, current_date),
          coalesce(nullif(trim(v_reparto->>'concepto'), ''), nullif(trim(p_concepto_pago), ''))
        );
      end if;
    end loop;
  end if;
end;
$$;