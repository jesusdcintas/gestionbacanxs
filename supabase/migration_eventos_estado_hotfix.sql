-- Hotfix idempotente para migrar public.eventos al nuevo modelo de estados
-- Ejecutar en SQL Editor sobre una base YA existente.

begin;

-- 1) Añadir columnas nuevas si faltan
alter table public.eventos
  add column if not exists estado_financiero text,
  add column if not exists estado_trabajo text;

-- 2) Migrar datos desde columna antigua "estado" SOLO si esa columna existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'eventos'
      AND column_name = 'estado'
  ) THEN
    UPDATE public.eventos
    SET
      estado_financiero = CASE
        WHEN estado = 'completado' THEN 'pagado'
        WHEN estado = 'confirmado' THEN 'no_pagado'
        WHEN estado = 'cancelado' THEN COALESCE(estado_financiero, 'no_pagado')
        WHEN estado = 'pendiente' THEN 'no_pagado'
        ELSE COALESCE(estado_financiero, 'no_pagado')
      END,
      estado_trabajo = CASE
        WHEN estado = 'completado' THEN 'realizado'
        WHEN estado = 'confirmado' THEN 'confirmado'
        WHEN estado = 'cancelado' THEN 'cancelado'
        WHEN estado = 'pendiente' THEN 'confirmado'
        ELSE COALESCE(estado_trabajo, 'confirmado')
      END
    WHERE estado_financiero IS NULL OR estado_trabajo IS NULL;
  END IF;
END $$;

-- 3) Defaults y NOT NULL
update public.eventos
set estado_financiero = 'no_pagado'
where estado_financiero is null;

update public.eventos
set estado_trabajo = 'confirmado'
where estado_trabajo is null;

alter table public.eventos
  alter column estado_financiero set default 'no_pagado',
  alter column estado_financiero set not null,
  alter column estado_trabajo set default 'confirmado',
  alter column estado_trabajo set not null;

-- 4) Constraints nuevas
alter table public.eventos drop constraint if exists eventos_estado_check;
alter table public.eventos drop constraint if exists eventos_estado_financiero_check;
alter table public.eventos drop constraint if exists eventos_estado_trabajo_check;

alter table public.eventos
  add constraint eventos_estado_financiero_check
  check (estado_financiero in ('no_pagado','parcialmente_pagado','pagado')),
  add constraint eventos_estado_trabajo_check
  check (estado_trabajo in ('confirmado','realizado','cancelado'));

-- 5) Columna calculada
alter table public.eventos drop column if exists estado_completo;
alter table public.eventos
  add column estado_completo text generated always as (
    case
      when estado_trabajo = 'realizado' and estado_financiero = 'pagado' then 'completado'
      else estado_trabajo
    end
  ) stored;

-- 6) Índices
drop index if exists idx_eventos_estado;
create index if not exists idx_eventos_estado_financiero on public.eventos (estado_financiero);
create index if not exists idx_eventos_estado_trabajo on public.eventos (estado_trabajo);

-- 7) Eliminar columna antigua si existe
alter table public.eventos drop column if exists estado;

commit;

-- Verificación
-- select column_name
-- from information_schema.columns
-- where table_schema='public' and table_name='eventos'
-- order by ordinal_position;
--
-- select estado_financiero, estado_trabajo, estado_completo, count(*)
-- from public.eventos
-- group by 1,2,3
-- order by 1,2;