-- Migración: separar estado de eventos en dos dimensiones
-- - estado_financiero: no_pagado | parcialmente_pagado | pagado
-- - estado_trabajo: confirmado | realizado | cancelado
-- Compatibilidad:
-- - se crea columna calculada estado_completo con regla de negocio
-- - se elimina columna antigua estado

begin;

-- 1) Añadir nuevas columnas (si no existen)
alter table public.eventos
  add column if not exists estado_financiero text,
  add column if not exists estado_trabajo text;

-- 2) Migrar datos desde columna antigua "estado" (solo filas no migradas aún)
update public.eventos
set
  estado_financiero = case
    when estado = 'completado' then 'pagado'
    when estado = 'confirmado' then 'no_pagado'
    when estado = 'cancelado' then coalesce(estado_financiero, 'no_pagado')
    when estado = 'pendiente' then 'no_pagado'
    else coalesce(estado_financiero, 'no_pagado')
  end,
  estado_trabajo = case
    when estado = 'completado' then 'realizado'
    when estado = 'confirmado' then 'confirmado'
    when estado = 'cancelado' then 'cancelado'
    when estado = 'pendiente' then 'confirmado'
    else coalesce(estado_trabajo, 'confirmado')
  end
where estado_financiero is null or estado_trabajo is null;

-- 3) Defaults + NOT NULL
alter table public.eventos
  alter column estado_financiero set default 'no_pagado',
  alter column estado_trabajo set default 'confirmado';

update public.eventos
set estado_financiero = 'no_pagado'
where estado_financiero is null;

update public.eventos
set estado_trabajo = 'confirmado'
where estado_trabajo is null;

alter table public.eventos
  alter column estado_financiero set not null,
  alter column estado_trabajo set not null;

-- 4) Reemplazar constraints
alter table public.eventos drop constraint if exists eventos_estado_check;
alter table public.eventos drop constraint if exists eventos_estado_financiero_check;
alter table public.eventos drop constraint if exists eventos_estado_trabajo_check;

alter table public.eventos
  add constraint eventos_estado_financiero_check
  check (estado_financiero in ('no_pagado','parcialmente_pagado','pagado')),
  add constraint eventos_estado_trabajo_check
  check (estado_trabajo in ('confirmado','realizado','cancelado'));

-- 5) Columna calculada para la UI/compatibilidad
-- Regla: completado solo cuando trabajo=realizado y financiero=pagado
alter table public.eventos drop column if exists estado_completo;
alter table public.eventos
  add column estado_completo text generated always as (
    case
      when estado_trabajo = 'realizado' and estado_financiero = 'pagado' then 'completado'
      else estado_trabajo
    end
  ) stored;

-- 6) Índices
create index if not exists idx_eventos_estado_financiero on public.eventos (estado_financiero);
create index if not exists idx_eventos_estado_trabajo on public.eventos (estado_trabajo);

-- 7) Eliminar columna antigua
alter table public.eventos drop column if exists estado;

commit;

-- Verificación recomendada:
-- select estado_financiero, estado_trabajo, estado_completo, count(*)
-- from public.eventos
-- group by 1,2,3
-- order by 1,2;
