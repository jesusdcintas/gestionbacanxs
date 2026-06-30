-- Gestor Bacanxs - Reparación de Auth
-- Ejecutar en el SQL Editor de Supabase si un usuario quedó corrupto o el login devuelve 500.

-- Borra el usuario de Auth y su profile asociado si existe.
-- Si Supabase no permite borrar auth.users desde SQL en tu proyecto, hazlo desde
-- Authentication > Users en el dashboard y luego ejecuta solo el DELETE de profiles.

do $$
declare
  u_id uuid;
begin
  select id into u_id
  from auth.users
  where email = 'jesus.cintasmu@gmail.com';

  if u_id is not null then
    delete from auth.identities where user_id = u_id;
    delete from auth.users where id = u_id;
    delete from public.profiles where id = u_id;
  end if;
end $$;

-- Si después creas el usuario desde Authentication > Users, sincroniza el profile así:
-- insert into public.profiles (id, nombre)
-- values ('UUID_DEL_USUARIO', 'Jesus Cintas')
-- on conflict (id) do update
-- set nombre = excluded.nombre;
