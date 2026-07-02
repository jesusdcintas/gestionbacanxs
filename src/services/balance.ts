import type { APIContext } from 'astro';
import { getSupabaseServerClient } from '../lib/supabase';
import { calcularBalanceSocio } from '../utils/finanzas';

/**
 * Balance de un socio individual
 */
export interface BalanceSocio {
  socio_id: string;
  nombre: string;
  totalCobrado: number;      // Total que ha cobrado de repartos
  totalAportado: number;     // Total gastado de su bolsillo (no reembolsado)
  totalReembolsado: number;  // Total que ya se le reembolsó
  balance: number;           // totalCobrado - totalAportado (positivo = debe recibir, negativo = debe aportar)
}

/**
 * Obtiene el balance entre socios
 * Calcula lo que cada socio ha cobrado vs lo que ha aportado en gastos
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

  // Para cada socio, calcular su balance
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

    // Calcular balance
    const balance = calcularBalanceSocio(totalCobrado, totalAportado);

    balances.push({
      socio_id: socio.id,
      nombre: socio.nombre,
      totalCobrado,
      totalAportado,
      totalReembolsado,
      balance,
    });
  }

  // Ordenar por balance descendente (los que más deben recibir primero)
  return balances.sort((a, b) => b.balance - a.balance);
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
 * Gasto pendiente de reembolso con nombre del socio y evento (vista global)
 */
export interface GastoPendienteReembolso {
  id: string;
  fecha: string;
  concepto: string;
  categoria: string;
  cantidad: number;
  pagado_por: string;
  evento_id: string | null;
  socio_nombre: string;
  evento_nombre: string | null;
}

/**
 * Obtiene todos los gastos pendientes de reembolso (todos los socios)
 */
export async function getAllGastosPendientes(
  context: APIContext,
): Promise<GastoPendienteReembolso[]> {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('gasto_pagos')
    .select('cantidad, socio_id, gastos!inner(id, fecha, concepto, categoria, evento_id, reembolsado, eventos(nombre)), profiles(nombre)')
    .not('socio_id', 'is', null)
    .eq('gastos.reembolsado', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching gastos pendientes:', error);
    throw new Error('No se pudieron cargar los gastos pendientes de reembolso');
  }

  return (data ?? []).map((g: any) => ({
    id: g.gastos.id,
    fecha: g.gastos.fecha,
    concepto: g.gastos.concepto,
    categoria: g.gastos.categoria,
    cantidad: Number(g.cantidad),
    pagado_por: g.socio_id,
    evento_id: g.gastos.evento_id,
    socio_nombre: g.profiles?.nombre ?? '—',
    evento_nombre: g.gastos.eventos?.nombre ?? null,
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
