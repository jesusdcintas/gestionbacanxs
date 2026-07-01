#!/usr/bin/env python3
"""Genera supabase/seed.sql a partir de Cuentas_Bacanas.json."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Cuentas_Bacanas.json"
OUT = ROOT / "seed.sql"

UUID_CINTAS = "4627a88e-9c86-4c6c-b502-a1d2b7ef823e"
UUID_BUJIA = "c4f44b8a-aa8c-432b-8ca9-01683e934121"


def sql_str(value):
    if value is None:
        return "NULL"
    s = str(value).strip()
    if s == "":
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def sql_num(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return f"{float(value):.2f}"
    s = str(value).strip().replace("€", "").replace(" ", "")
    # Si trae coma decimal (formato es), normalizar
    if "," in s and "." not in s:
        s = s.replace(",", ".")
    elif "," in s and "." in s:
        # 1.234,56 → 1234.56
        s = s.replace(".", "").replace(",", ".")
    try:
        return f"{float(s):.2f}"
    except ValueError:
        return None


def sql_bool(value):
    return "TRUE" if value else "FALSE"


def parse_date(value):
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    s = s.split(" ")[0]  # quita HH:MM:SS
    if "/" in s:
        try:
            d, m, y = s.split("/")
            return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
        except ValueError:
            return None
    if "-" in s:
        try:
            y, m, d = s.split("-")
            return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
        except ValueError:
            return None
    return None


ESTADO_MAP = {
    "Cobrado": "completado",
    "Cerrado": "completado",
    "Parcialmente cobrado": "confirmado",
}


def map_estado(value):
    if value is None:
        return "pendiente"
    return ESTADO_MAP.get(str(value).strip(), "pendiente")


CAT_RULES = [
    (re.compile(r"\b(cable|conector|rack|altavoz|subgrave|mesa|controlador|dmx)\b", re.I), "Equipamiento"),
    (re.compile(r"\b(furgoneta|gasolina|dhl|aduanas?)\b", re.I), "Transporte"),
    (re.compile(r"\bseguro\b", re.I), "Seguros"),
    (re.compile(r"\b(camiseta|lona|tela|rótulo|rotulo|confeti)\b", re.I), "Material"),
    (re.compile(r"\b(honorarios|contrato)\b", re.I), "Servicios"),
]


def categoria_for(concepto):
    if not concepto:
        return "Otros"
    for rgx, cat in CAT_RULES:
        if rgx.search(concepto):
            return cat
    return "Otros"


PAGADO_MAP = {
    "Cintas": UUID_CINTAS,
    "Bujía": UUID_BUJIA,
    "Bujia": UUID_BUJIA,
}


def map_pagado_por(value):
    if value is None:
        return None
    return PAGADO_MAP.get(str(value).strip())  # Fondo Bacanxs / Adelanto boda → None


def build_eventos_block(bolos_rows):
    parts = []
    for row in bolos_rows:
        fecha_raw = row[0]
        nombre = row[1]
        cliente = row[2]
        tipo = row[3]
        estado_raw = row[4]
        total = row[5]

        if fecha_raw is None and nombre is None:
            continue

        fecha = parse_date(fecha_raw)
        presupuesto = sql_num(total) or "0.00"
        con_factura = (str(tipo).strip().upper() == "A") if tipo else False
        retencion = "20.00" if con_factura else "0.00"
        estado = map_estado(estado_raw)

        # Si Evento == Cliente, el cliente queda igualmente en su columna
        observaciones = row[17]

        ev_inserto = f"""
WITH ev AS (
  INSERT INTO public.eventos (
    nombre, fecha, lugar, cliente, presupuesto,
    con_factura, retencion_irpf, estado, observaciones, created_by
  ) VALUES (
    {sql_str(nombre)},
    {('DATE ' + sql_str(fecha)) if fecha else 'NULL'},
    NULL,
    {sql_str(cliente)},
    {presupuesto},
    {sql_bool(con_factura)},
    {retencion},
    {sql_str(estado)},
    {sql_str(observaciones)},
    NULL
  )
  RETURNING id
)"""

        pagos = []
        for i, (pago_idx, fecha_idx, dest_idx) in enumerate(
            [(6, 7, 8), (9, 10, 11), (12, 13, 14)], start=1
        ):
            cantidad = sql_num(row[pago_idx])
            fecha_pago = parse_date(row[fecha_idx])
            destino = row[dest_idx]
            if not cantidad or float(cantidad) <= 0 or not fecha_pago:
                continue
            pagos.append(
                f"  (SELECT id FROM ev), DATE {sql_str(fecha_pago)}, {cantidad}, {sql_str(destino)}, NULL"
            )

        if pagos:
            inserts = ",\n  ".join(f"({p})" for p in pagos)
            ev_inserto += f"""
INSERT INTO public.pagos_evento (evento_id, fecha, cantidad, concepto, created_by)
VALUES
  {inserts};
"""
        else:
            # Sin pagos: aún así hay que ejecutar la CTE
            ev_inserto += """
SELECT id FROM ev;
"""

        parts.append(ev_inserto)
    return "\n".join(parts)


def build_gastos_block(compras_rows):
    rows_sql = []
    for row in compras_rows:
        fecha_raw = row[0]
        concepto = row[1]
        importe = row[2]
        pagado_por_raw = row[3]
        # forma_pago = row[4]  # no se usa
        # reembolsado_raw = row[5]
        observaciones = row[6]

        if fecha_raw is None and concepto is None:
            continue
        fecha = parse_date(fecha_raw)
        cantidad = sql_num(importe)
        if not fecha or not cantidad or float(cantidad) <= 0 or not concepto:
            continue

        categoria = categoria_for(concepto)
        pagado_por_uuid = map_pagado_por(pagado_por_raw)
        pagado_sql = sql_str(pagado_por_uuid) if pagado_por_uuid else "NULL"
        concepto_full = concepto
        if observaciones:
            # No concatenamos en concepto: el esquema no tiene observaciones en gastos
            pass

        rows_sql.append(
            f"  ({sql_str(concepto_full)}, {cantidad}, {sql_str(categoria)}, DATE {sql_str(fecha)}, NULL, {pagado_sql}, FALSE, NULL)"
        )
    if not rows_sql:
        return ""
    return (
        "INSERT INTO public.gastos (concepto, cantidad, categoria, fecha, evento_id, pagado_por, reembolsado, created_by) VALUES\n"
        + ",\n".join(rows_sql)
        + ";\n"
    )


def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))

    bolos = [
        r for r in data["BOLOS"][1:]
        if any(c not in (None, "") for c in r)
    ]
    compras = [
        r for r in data["COMPRAS"][1:]
        if any(c not in (None, "") for c in r)
    ]

    header = """-- ============================================================================
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
"""

    eventos_sql = build_eventos_block(bolos)
    gastos_sql = build_gastos_block(compras)

    gastos_header = """
-- ----------------------------------------------------------------------------
-- GASTOS (desde hoja COMPRAS del Excel)
-- ----------------------------------------------------------------------------
"""

    footer = """
COMMIT;

-- ============================================================================
-- VERIFICACIÓN (ejecuta tras el COMMIT para comprobar conteos):
--   SELECT COUNT(*) AS eventos        FROM public.eventos;
--   SELECT COUNT(*) AS pagos_evento   FROM public.pagos_evento;
--   SELECT COUNT(*) AS gastos         FROM public.gastos;
--   SELECT COUNT(*) AS aportaciones   FROM public.aportaciones;
-- ============================================================================
"""

    OUT.write_text(header + eventos_sql + gastos_header + gastos_sql + footer, encoding="utf-8")
    print(f"OK · escrito {OUT}")
    print(f"  bolos procesados: {len(bolos)}")
    print(f"  compras procesadas: {len(compras)}")


if __name__ == "__main__":
    sys.exit(main())
