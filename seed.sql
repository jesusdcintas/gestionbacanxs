-- ============================================================================
-- seed.sql · Importación de "Cuentas Bacanas" (Excel) a Supabase
-- Generado automáticamente desde Cuentas_Bacanas.json
-- Socios:
--   Cintas → 4627a88e-9c86-4c6c-b502-a1d2b7ef823e
--   Bujía  → c4f44b8a-aa8c-432b-8ca9-01683e934121
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Tabla APORTACIONES (no existía en el esquema v2; se crea aquí)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aportaciones (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  socio_id    uuid NOT NULL REFERENCES public.profiles(id),
  cantidad    numeric(10,2) NOT NULL CHECK (cantidad > 0),
  fecha       date NOT NULL DEFAULT current_date,
  concepto    text,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.aportaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_all ON public.aportaciones;
CREATE POLICY authenticated_all ON public.aportaciones
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- APORTACIONES iniciales (desde hoja APORTACIONES del Excel)
-- ----------------------------------------------------------------------------
INSERT INTO public.aportaciones (socio_id, cantidad, fecha, concepto, created_by) VALUES
  ('c4f44b8a-aa8c-432b-8ca9-01683e934121', 7000.00, DATE '2025-02-19', 'Capital inicial', NULL);

-- ----------------------------------------------------------------------------
-- EVENTOS + PAGOS_EVENTO (desde hoja BOLOS del Excel)
-- Cada bolo se inserta como un evento y sus pagos asociados
-- ----------------------------------------------------------------------------

WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Sonorización Entrebotas',
    DATE '2026-05-01',
    NULL,
    'Entrebotas',
    242.00,
    TRUE,
    20.00,
    'completado',
    'Factura 23 · 200 € + IVA · reparto: base - 20% impuestos, al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-05-01', 242.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Sonorización Entrebotas',
    DATE '2026-04-04',
    NULL,
    'Entrebotas',
    242.00,
    TRUE,
    20.00,
    'completado',
    'Factura 17 · 200 € + IVA · reparto: base - 20% impuestos, al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-04-04', 242.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'La Obra',
    DATE '2026-03-07',
    NULL,
    'La Obra',
    150.00,
    FALSE,
    0.00,
    'completado',
    'Añadido manualmente · B · Repartido al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-03-07', 150.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'La Obra',
    DATE '2026-03-07',
    NULL,
    'La Obra',
    150.00,
    FALSE,
    0.00,
    'completado',
    'Añadido manualmente · B · Repartido al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-03-07', 150.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Sonorización Entrebotas',
    DATE '2026-03-07',
    NULL,
    'Entrebotas',
    242.00,
    TRUE,
    20.00,
    'completado',
    'Factura 8 · 200 € + IVA · reparto: base - 20% impuestos, al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-03-07', 242.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Sonorización Entrebotas',
    DATE '2025-12-07',
    NULL,
    'Entrebotas',
    242.00,
    TRUE,
    20.00,
    'completado',
    'Factura 71 · 200 € + IVA · reparto: base - 20% impuestos, al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2025-12-07', 242.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Sonorización Entrebotas',
    DATE '2025-11-08',
    NULL,
    'Entrebotas',
    200.00,
    FALSE,
    0.00,
    'completado',
    'Importado de CONTABILIDAD 2025 - bolo en B repartido al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2025-11-08', 200.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Sonorización Entrebotas',
    DATE '2025-12-13',
    NULL,
    'Entrebotas',
    242.00,
    TRUE,
    20.00,
    'completado',
    'Factura 73 · 200 € + IVA · reparto: base - 20% impuestos, al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2025-12-13', 242.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'La Obra',
    DATE '2026-02-14',
    NULL,
    'La Obra',
    150.00,
    FALSE,
    0.00,
    'completado',
    'Añadido manualmente · B · Repartido al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-02-14', 150.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'La Obra',
    DATE '2026-02-14',
    NULL,
    'La Obra',
    150.00,
    FALSE,
    0.00,
    'completado',
    'Añadido manualmente · B · Repartido al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-02-14', 150.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Sonorización Entrebotas',
    DATE '2026-04-18',
    NULL,
    'Entrebotas',
    302.50,
    TRUE,
    20.00,
    'completado',
    'Factura 19 · 250 € + IVA · reparto: base - 20% impuestos, al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-04-18', 302.50, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Sonorización Entrebotas',
    DATE '2025-12-20',
    NULL,
    'Entrebotas',
    484.00,
    TRUE,
    20.00,
    'completado',
    'Factura 77 · 400 € + IVA · reparto: base - 20% impuestos, al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2025-12-20', 484.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'La Obra',
    DATE '2026-02-21',
    NULL,
    'La Obra',
    150.00,
    FALSE,
    0.00,
    'completado',
    'Añadido manualmente · B · Repartido al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-02-21', 150.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'La Obra',
    DATE '2026-02-21',
    NULL,
    'La Obra',
    150.00,
    FALSE,
    0.00,
    'completado',
    'Añadido manualmente · B · Repartido al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-02-21', 150.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Sonorización Entrebotas',
    DATE '2026-03-21',
    NULL,
    'Entrebotas',
    242.00,
    TRUE,
    20.00,
    'completado',
    'Factura 11 · 200 € + IVA · reparto: base - 20% impuestos, al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-03-21', 242.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Sonorización Entrebotas',
    DATE '2025-11-22',
    NULL,
    'Entrebotas',
    200.00,
    FALSE,
    0.00,
    'completado',
    'Importado de CONTABILIDAD 2025 - bolo en B repartido al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2025-11-22', 200.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Sonorización Entrebotas',
    DATE '2025-10-24',
    NULL,
    'Entrebotas',
    180.00,
    FALSE,
    0.00,
    'completado',
    'Importado de CONTABILIDAD 2025 - bolo en B repartido al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2025-10-24', 180.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Sonorización Entrebotas',
    DATE '2025-10-25',
    NULL,
    'Entrebotas',
    200.00,
    FALSE,
    0.00,
    'completado',
    'Importado de CONTABILIDAD 2025 - bolo en B repartido al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2025-10-25', 200.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'La Obra',
    DATE '2026-02-28',
    NULL,
    'La Obra',
    150.00,
    FALSE,
    0.00,
    'completado',
    'Añadido manualmente · B · Repartido al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-02-28', 150.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'La Obra',
    DATE '2026-02-28',
    NULL,
    'La Obra',
    150.00,
    FALSE,
    0.00,
    'completado',
    'Añadido manualmente · B · Repartido al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-02-28', 150.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Sonorización Entrebotas',
    DATE '2026-02-28',
    NULL,
    'Entrebotas',
    242.00,
    TRUE,
    20.00,
    'completado',
    'Factura 7 · 200 € + IVA · reparto: base - 20% impuestos, al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-02-28', 242.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Sonorización Entrebotas',
    DATE '2026-03-28',
    NULL,
    'Entrebotas',
    242.00,
    TRUE,
    20.00,
    'completado',
    'Factura 13 · 200 € + IVA · reparto: base - 20% impuestos, al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-03-28', 242.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Sonorización Entrebotas',
    DATE '2025-11-29',
    NULL,
    'Entrebotas',
    350.00,
    FALSE,
    0.00,
    'completado',
    'Importado de CONTABILIDAD 2025 - bolo en B repartido al 50%',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2025-11-29', 350.00, 'Reparto', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Boda Alejandra Lucero',
    DATE '2026-05-30',
    NULL,
    NULL,
    1950.00,
    FALSE,
    0.00,
    'completado',
    'Añadido manualmente · Por confirmar',
    NULL
  )
  RETURNING id
)
SELECT id FROM ev;


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Boda Migue Hermano Andres',
    DATE '2026-07-18',
    NULL,
    NULL,
    1690.00,
    FALSE,
    0.00,
    'confirmado',
    'Añadido manualmente · Hermano Andrés',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-05-05', 400.00, 'Fondo', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Boda Bea y Antonio',
    DATE '2026-08-01',
    NULL,
    NULL,
    0.00,
    FALSE,
    0.00,
    'completado',
    'Añadido manualmente',
    NULL
  )
  RETURNING id
)
SELECT id FROM ev;


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Boda Diego Ohana',
    DATE '2026-09-26',
    NULL,
    NULL,
    1000.00,
    FALSE,
    0.00,
    'completado',
    'Añadido manualmente',
    NULL
  )
  RETURNING id
)
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  (  (SELECT id FROM ev), DATE '2026-05-15', 250.00, 'Fondo', NULL);


WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    'Boda Marta Listán',
    DATE '2027-06-19',
    NULL,
    NULL,
    1500.00,
    FALSE,
    0.00,
    'completado',
    'Añadido manualmente',
    NULL
  )
  RETURNING id
)
SELECT id FROM ev;

-- ----------------------------------------------------------------------------
-- GASTOS (desde hoja COMPRAS del Excel)
-- ----------------------------------------------------------------------------
INSERT INTO public.gastos (concepto, cantidad, categoria, fecha, evento_id, pagado_por, reembolsado, created_by) VALUES
  ('Thomann - Truss Global Truss F33200, trípodes Varytec Wind Up y adaptadores', 1055.00, 'Otros', DATE '2025-02-20', NULL, NULL, FALSE, NULL),
  ('Alibaba / Guangzhou MOWL - Moving heads, cold spark, strobes, humo, CO2, bola espejo, confetti y hooks', 4511.43, 'Otros', DATE '2025-02-20', NULL, NULL, FALSE, NULL),
  ('Amazon - Akai Professional APC Mini MK2 controlador MIDI', 90.00, 'Equipamiento', DATE '2025-03-06', NULL, NULL, FALSE, NULL),
  ('AliExpress - Sistema Wireless DMX 512 2.4G', 78.39, 'Equipamiento', DATE '2025-03-10', NULL, NULL, FALSE, NULL),
  ('LTT Group - Chauvet DJ DMX-AN2 + envío', 174.42, 'Equipamiento', DATE '2025-03-24', NULL, NULL, FALSE, NULL),
  ('Eduardo Merino Romero - Honorarios contrato acuerdo Bacanxs y préstamo', 95.40, 'Servicios', DATE '2025-03-31', NULL, NULL, FALSE, NULL),
  ('Rótula Tú Mismo - Lonas impresas Bacanxs', 90.89, 'Otros', DATE '2025-05-14', NULL, NULL, FALSE, NULL),
  ('Cables DMX', 40.99, 'Equipamiento', DATE '2025-05-22', NULL, NULL, FALSE, NULL),
  ('Tela escenario', 27.00, 'Material', DATE '2025-05-22', NULL, NULL, FALSE, NULL),
  ('Cabo Noval', 18.00, 'Otros', DATE '2025-05-23', NULL, NULL, FALSE, NULL),
  ('Motor bola', 12.58, 'Otros', DATE '2025-06-04', NULL, NULL, FALSE, NULL),
  ('JIN AN MARKET 1 - REGLETAS CHINO', 101.15, 'Otros', DATE '2025-06-11', NULL, NULL, FALSE, NULL),
  ('JIN AN MARKET 2 - REGLETAS CHINO', 59.00, 'Otros', DATE '2025-06-11', NULL, NULL, FALSE, NULL),
  ('Camisetas', 20.00, 'Otros', DATE '2025-06-13', NULL, NULL, FALSE, NULL),
  ('Altavoces RCF', 3420.04, 'Otros', DATE '2025-08-10', NULL, '4627a88e-9c86-4c6c-b502-a1d2b7ef823e', FALSE, NULL),
  ('DHL Express Spain - Aduanas/importación China-España', 131.15, 'Transporte', DATE '2025-08-22', NULL, NULL, FALSE, NULL),
  ('Neón - PDF sin texto extraíble', 346.55, 'Otros', DATE '2025-09-01', NULL, NULL, FALSE, NULL),
  ('Thomann - Subgrave 218', 1202.00, 'Equipamiento', DATE '2025-09-15', NULL, '4627a88e-9c86-4c6c-b502-a1d2b7ef823e', FALSE, NULL),
  ('Electro Rey - Cables Jacks', 63.98, 'Otros', DATE '2025-09-15', NULL, 'c4f44b8a-aa8c-432b-8ca9-01683e934121', FALSE, NULL),
  ('BimotorDJ - Soundcraft Ui24R', 837.00, 'Otros', DATE '2025-09-18', NULL, '4627a88e-9c86-4c6c-b502-a1d2b7ef823e', FALSE, NULL),
  ('Thomann - Rack, cables XLR/jack, cajas DI, clips micro, safe box y caja madera', 773.20, 'Equipamiento', DATE '2025-09-20', NULL, '4627a88e-9c86-4c6c-b502-a1d2b7ef823e', FALSE, NULL),
  ('Seguro Responsabilidad civil', 366.08, 'Seguros', DATE '2025-10-02', NULL, '4627a88e-9c86-4c6c-b502-a1d2b7ef823e', FALSE, NULL),
  ('Separadores catenaria', 78.00, 'Otros', DATE '2025-12-13', NULL, '4627a88e-9c86-4c6c-b502-a1d2b7ef823e', FALSE, NULL),
  ('Thomann sub + conectores xlr y jack', 262.95, 'Otros', DATE '2026-05-12', NULL, '4627a88e-9c86-4c6c-b502-a1d2b7ef823e', FALSE, NULL),
  ('Thomann sub + conectores xlr y jack', 148.05, 'Otros', DATE '2026-05-12', NULL, NULL, FALSE, NULL),
  ('Thomann sub + conectores xlr y jack', 400.00, 'Otros', DATE '2026-05-12', NULL, NULL, FALSE, NULL),
  ('Funda y ruedas sub thomann', 77.90, 'Otros', DATE '2026-05-14', NULL, '4627a88e-9c86-4c6c-b502-a1d2b7ef823e', FALSE, NULL),
  ('Clavijas powercon y empalmes aliexpress', 75.17, 'Otros', DATE '2026-05-25', NULL, '4627a88e-9c86-4c6c-b502-a1d2b7ef823e', FALSE, NULL),
  ('Mesa sonido sonicolor', 85.00, 'Equipamiento', DATE '2026-05-25', NULL, '4627a88e-9c86-4c6c-b502-a1d2b7ef823e', FALSE, NULL),
  ('Bombonas Co2', 260.00, 'Otros', DATE '2026-05-22', NULL, 'c4f44b8a-aa8c-432b-8ca9-01683e934121', FALSE, NULL),
  ('Confeti y polvo de maquina de chispas', 125.72, 'Material', DATE '2026-05-26', NULL, '4627a88e-9c86-4c6c-b502-a1d2b7ef823e', FALSE, NULL);

COMMIT;

-- ============================================================================
-- VERIFICACIÓN (ejecuta tras el COMMIT para comprobar conteos):
--   SELECT COUNT(*) AS eventos        FROM public.eventos;
--   SELECT COUNT(*) AS pagos_evento   FROM public.pagos_evento;
--   SELECT COUNT(*) AS gastos         FROM public.gastos;
--   SELECT COUNT(*) AS aportaciones   FROM public.aportaciones;
-- ============================================================================
