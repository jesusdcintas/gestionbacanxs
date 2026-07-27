import type { APIContext } from 'astro';
import { getSupabaseServerClient } from '../lib/supabase';

/**
 * Balance de un socio individual
 */
export interface BalanceSocio {
  socio_id: string;
  nombre: string;
  totalCobrado: number;      // Total cobrado en repartos de eventos
  totalAportado: number;     // Total gastado de su bolsillo (solo no reembolsado)
  totalReembolsado: number;  // Total histórico ya reembolsado
  eventosTrabajados: number; // Total de eventos trabajados
}

export interface RepartoDetalleEvento {
  evento_id: string;
  eventoNombre: string;
  eventoFecha: string | null;
  totalCobrado: number;
}

export type RepartosDetallePorSocio = Record<string, RepartoDetalleEvento[]>;

/**
 * Obtiene métricas por socio para:
 * 1) Pendiente de reembolso (totalAportado no reembolsado)
 * 2) Repartos informativos (totalCobrado y eventosTrabajados)
 */
export async function getBalanceSocios(context: APIContext): Promise<BalanceSocio[]> {
  const supabase = getSupabaseServerClient(context);

  // Obtener todos los socios
  const { data: socios, error: sociosError } = await supabase
    .from('profiles')
    .select('id, nombre')
    .order('nombre');

  if (sociosError) {
    console.error('Error fetching socios:', sociosError);
    throw new Error('No se pudieron cargar los socios');
  }

  // Para cada socio, calcular métricas financieras separadas
  const balances: BalanceSocio[] = [];

  for (const socio of socios) {
    // Total cobrado de repartos
    const { data: repartos, error: repartosError } = await supabase
      .from('repartos_evento')
      .select('cantidad')
      .eq('socio_id', socio.id);

    if (repartosError) {
      console.error(`Error fetching repartos for socio ${socio.id}:`, repartosError);
      continue;
    }

    const totalCobrado = repartos.reduce((sum, r) => sum + Number(r.cantidad), 0);

    // Eventos trabajados (conteo por evento)
    const { data: trabajos, error: trabajosError } = await supabase
      .from('evento_trabajadores')
      .select('evento_id')
      .eq('socio_id', socio.id);

    if (trabajosError) {
      console.error(`Error fetching eventos trabajados for socio ${socio.id}:`, trabajosError);
      continue;
    }

    const eventosTrabajados = new Set((trabajos ?? []).map((t) => t.evento_id)).size;

    // Total aportado en gastos de su bolsillo usando gasto_pagos
    const { data: pagosSocio, error: pagosError } = await supabase
      .from('gasto_pagos')
      .select('cantidad, gastos!inner(reembolsado)')
      .eq('socio_id', socio.id);

    if (pagosError) {
      console.error(`Error fetching gasto_pagos for socio ${socio.id}:`, pagosError);
      continue;
    }

    const totalReembolsado = (pagosSocio ?? [])
      .filter((p: any) => Boolean(p.gastos?.reembolsado))
      .reduce((sum, p: any) => sum + Number(p.cantidad), 0);

    const totalAportado = (pagosSocio ?? [])
      .filter((p: any) => !Boolean(p.gastos?.reembolsado))
      .reduce((sum, p: any) => sum + Number(p.cantidad), 0);

    balances.push({
      socio_id: socio.id,
      nombre: socio.nombre,
      totalCobrado,
      totalAportado,
      totalReembolsado,
      eventosTrabajados,
    });
  }

  return balances.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Obtiene el balance de un socio específico
 */
export async function getBalanceSocio(
  context: APIContext,
  socioId: string
): Promise<BalanceSocio | null> {
  const balances = await getBalanceSocios(context);
  return balances.find(b => b.socio_id === socioId) || null;
}

/**
 * Historico de repartos cobrados por socio, agrupado por evento.
 * Solo incluye repartos positivos y socios no nulos.
 */
export async function getRepartosDetallePorSocio(
  context: APIContext
): Promise<RepartosDetallePorSocio> {
  const supabase = getSupabaseServerClient(context);

  type EventoJoin = {
    nombre: string | null;
    fecha: string | null;
  };

  type RepartoRow = {
    socio_id: string | null;
    evento_id: string;
    cantidad: number | string;
    eventos: EventoJoin | EventoJoin[] | null;
  };

  const { data, error } = await supabase
    .from('repartos_evento')
    .select('socio_id, evento_id, cantidad, eventos(nombre, fecha)')
    .not('socio_id', 'is', null)
    .gt('cantidad', 0);

  if (error) {
    console.error('Error fetching detalle repartos por socio:', error);
    throw new Error('No se pudo cargar el detalle de repartos por socio');
  }

  const acumulado = new Map<string, RepartoDetalleEvento & { socio_id: string }>();

  for (const row of (data ?? []) as RepartoRow[]) {
    if (!row.socio_id) continue;

    const eventoJoin = Array.isArray(row.eventos) ? row.eventos[0] ?? null : row.eventos;
    const eventoNombre = eventoJoin?.nombre?.trim() || 'Evento sin nombre';
    const eventoFecha = eventoJoin?.fecha ?? null;
    const cantidad = Number(row.cantidad) || 0;
    const key = `${row.socio_id}::${row.evento_id}`;
    const previo = acumulado.get(key);

    if (previo) {
      previo.totalCobrado += cantidad;
      continue;
    }

    acumulado.set(key, {
      socio_id: row.socio_id,
      evento_id: row.evento_id,
      eventoNombre,
      eventoFecha,
      totalCobrado: cantidad,
    });
  }

  const salida: RepartosDetallePorSocio = {};

  for (const item of acumulado.values()) {
    if (!salida[item.socio_id]) salida[item.socio_id] = [];
    salida[item.socio_id].push({
      evento_id: item.evento_id,
      eventoNombre: item.eventoNombre,
      eventoFecha: item.eventoFecha,
      totalCobrado: item.totalCobrado,
    });
  }

  for (const socioId of Object.keys(salida)) {
    salida[socioId].sort((a, b) => {
      const ta = a.eventoFecha ? new Date(a.eventoFecha).getTime() : 0;
      const tb = b.eventoFecha ? new Date(b.eventoFecha).getTime() : 0;
      return tb - ta;
    });
  }

  return salida;
}

/**
 * Saldo por persona basado en cobros recibidos y gastos aportados.
 * saldo = pagos_evento.recibido_por - gasto_pagos.socio_id (no reembolsado)
 */
export interface SaldoCobrosPersona {
  socio_id: string;
  totalCobrado: number;
  totalAportado: number;
  saldo: number;
}

export async function getSaldoCobrosPersona(
  context: APIContext,
  socioId: string,
): Promise<SaldoCobrosPersona> {
  const supabase = getSupabaseServerClient(context);

  const [ingresosRes, gastosRes] = await Promise.all([
    supabase
      .from('pagos_evento')
      .select('cantidad')
      .eq('recibido_por', socioId),
    supabase
      .from('gasto_pagos')
      .select('cantidad, gastos!inner(reembolsado)')
      .eq('socio_id', socioId)
      .eq('gastos.reembolsado', false),
  ]);

  if (ingresosRes.error || gastosRes.error) {
    console.error('Error fetching saldo por persona:', ingresosRes.error ?? gastosRes.error);
    throw new Error('No se pudo calcular el saldo por persona');
  }

  const totalCobrado = (ingresosRes.data ?? []).reduce((sum, ingreso) => sum + Number(ingreso.cantidad), 0);
  const totalAportado = (gastosRes.data ?? []).reduce((sum, gasto: any) => sum + Number(gasto.cantidad), 0);

  return {
    socio_id: socioId,
    totalCobrado,
    totalAportado,
    saldo: totalCobrado - totalAportado,
  };
}

/**
 * Obtiene gastos pendientes de reembolso de un socio
 */
export async function getGastosPendientesReembolso(
  context: APIContext,
  socioId: string
) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('gasto_pagos')
    .select('cantidad, gastos!inner(*, eventos(nombre))')
    .eq('socio_id', socioId)
    .eq('gastos.reembolsado', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching gastos pendientes:', error);
    throw new Error('No se pudieron cargar los gastos pendientes de reembolso');
  }

  return (data ?? []).map((row: any) => ({
    ...row.gastos,
    cantidad_aportada: Number(row.cantidad),
  }));
}

/**
 * Obtiene el histórico de gastos reembolsados a un socio
 */
export async function getGastosReembolsados(
  context: APIContext,
  socioId: string
) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('gasto_pagos')
    .select('cantidad, gastos!inner(*, eventos(nombre))')
    .eq('socio_id', socioId)
    .eq('gastos.reembolsado', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching gastos reembolsados:', error);
    throw new Error('No se pudieron cargar los gastos reembolsados');
  }

  return (data ?? []).map((row: any) => ({
    ...row.gastos,
    cantidad_aportada: Number(row.cantidad),
  }));
}

/**
 * Datos mensuales de ingresos/gastos para los gráficos (últimos N meses)
 */
export interface BalanceMonthData {
  mes: string;
  ingresos: number;
  gastos: number;
  beneficio: number;
}

export async function getBalanceData(
  context: APIContext,
  meses: number = 6
): Promise<BalanceMonthData[]> {
  const supabase = getSupabaseServerClient(context);

  const now = new Date();
  const desde = new Date(now.getFullYear(), now.getMonth() - (meses - 1), 1);
  const desdeIso = desde.toISOString().split('T')[0];

  const [ingresosRes, gastosRes] = await Promise.all([
    supabase.from('pagos_evento').select('cantidad, fecha').gte('fecha', desdeIso),
    supabase.from('gastos').select('cantidad, fecha').gte('fecha', desdeIso),
  ]);

  if (ingresosRes.error || gastosRes.error) {
    console.error('Error fetching balance data:', ingresosRes.error ?? gastosRes.error);
    throw new Error('No se pudieron cargar los datos de balance');
  }

  const buckets = new Map<string, BalanceMonthData>();
  for (let i = 0; i < meses; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (meses - 1) + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, { mes: key, ingresos: 0, gastos: 0, beneficio: 0 });
  }

  for (const ing of ingresosRes.data ?? []) {
    const d = new Date(ing.fecha);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.ingresos += Number(ing.cantidad);
  }

  for (const g of gastosRes.data ?? []) {
    const d = new Date(g.fecha);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.gastos += Number(g.cantidad);
  }

  return Array.from(buckets.values())
    .map((b) => ({ ...b, beneficio: b.ingresos - b.gastos }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

/**
 * Total de gastos agrupados por categoría
 */
export interface CategoryDatum {
  categoria: string;
  total: number;
  porcentaje: number;
}

export async function getCategoryData(context: APIContext): Promise<CategoryDatum[]> {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase.from('gastos').select('categoria, cantidad');

  if (error) {
    console.error('Error fetching category data:', error);
    throw new Error('No se pudieron cargar las categorías');
  }

  const totalsByCat = new Map<string, number>();
  for (const g of data ?? []) {
    totalsByCat.set(g.categoria, (totalsByCat.get(g.categoria) ?? 0) + Number(g.cantidad));
  }

  const total = Array.from(totalsByCat.values()).reduce((sum, v) => sum + v, 0);

  return Array.from(totalsByCat.entries())
    .map(([categoria, totalCat]) => ({
      categoria,
      total: totalCat,
      porcentaje: total > 0 ? (totalCat / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}
