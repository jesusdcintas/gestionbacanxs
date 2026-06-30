-- Script para verificar qué datos tienes actualmente
-- Ejecuta esto ANTES de la migración para ver qué se va a perder

-- Contar registros en cada tabla
select 'eventos' as tabla, count(*) as registros from eventos
union all
select 'ingresos', count(*) from ingresos
union all
select 'gastos', count(*) from gastos;

-- Ver ingresos que NO están ligados a eventos (estos se perderán)
select 
  count(*) as ingresos_sin_evento,
  sum(cantidad) as total_cantidad
from ingresos 
where evento_id is null;

-- Ver detalle de ingresos sin evento (para decidir si hay que migrarlos manualmente)
select * from ingresos where evento_id is null order by fecha desc;

-- Ver ingresos que SÍ se migrarán a pagos_evento
select 
  count(*) as ingresos_con_evento,
  sum(cantidad) as total_cantidad
from ingresos 
where evento_id is not null;
