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

    // Total aportado en gastos pagados de su bolsillo
    const { data: gastos, error: gastosError } = await supabase
      .from('gastos')
      .select('cantidad, reembolsado')
      .eq('pagado_por', socio.id);

    if (gastosError) {
      console.error(`Error fetching gastos for socio ${socio.id}:`, gastosError);
      continue;
    }

    // Separar entre reembolsado y no reembolsado
    const totalReembolsado = gastos
      .filter(g => g.reembolsado)
      .reduce((sum, g) => sum + Number(g.cantidad), 0);

    const totalAportado = gastos
      .filter(g => !g.reembolsado)
      .reduce((sum, g) => sum + Number(g.cantidad), 0);

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
    .from('gastos')
    .select('*, eventos(nombre)')
    .eq('pagado_por', socioId)
    .eq('reembolsado', false)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos pendientes:', error);
    throw new Error('No se pudieron cargar los gastos pendientes de reembolso');
  }

  return data;
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
    .from('gastos')
    .select(
      'id, fecha, concepto, categoria, cantidad, pagado_por, evento_id, eventos(nombre), profiles!gastos_pagado_por_fkey(nombre)',
    )
    .not('pagado_por', 'is', null)
    .eq('reembolsado', false)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos pendientes:', error);
    throw new Error('No se pudieron cargar los gastos pendientes de reembolso');
  }

  return (data ?? []).map((g: any) => ({
    id: g.id,
    fecha: g.fecha,
    concepto: g.concepto,
    categoria: g.categoria,
    cantidad: Number(g.cantidad),
    pagado_por: g.pagado_por,
    evento_id: g.evento_id,
    socio_nombre: g.profiles?.nombre ?? '—',
    evento_nombre: g.eventos?.nombre ?? null,
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
    .from('gastos')
    .select('*, eventos(nombre)')
    .eq('pagado_por', socioId)
    .eq('reembolsado', true)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos reembolsados:', error);
    throw new Error('No se pudieron cargar los gastos reembolsados');
  }

  return data;
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
    supabase.from('ingresos').select('cantidad, fecha').gte('fecha', desdeIso),
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
