import type { APIContext } from 'astro';
import { getSupabaseServerClient } from '../lib/supabase';
import type { Database } from '../types/database';
import { calcularSaldoFondo } from '../utils/finanzas';

type FondoMovimiento = Database['public']['Tables']['fondo_movimientos']['Row'];
type FondoMovimientoInsert = Database['public']['Tables']['fondo_movimientos']['Insert'];

/**
 * Obtiene todos los movimientos del fondo de empresa
 */
export async function getMovimientosFondo(context: APIContext) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('fondo_movimientos')
    .select('*, eventos(nombre), gastos(concepto)')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching movimientos fondo:', error);
    throw new Error('No se pudieron cargar los movimientos del fondo');
  }

  return data as (FondoMovimiento & {
    eventos?: { nombre: string } | null;
    gastos?: { concepto: string } | null;
  })[];
}

/**
 * Obtiene movimientos del fondo filtrados por rango de fechas
 */
export async function getMovimientosFondoByDateRange(
  context: APIContext,
  fechaInicio: string,
  fechaFin: string
) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('fondo_movimientos')
    .select('*, eventos(nombre), gastos(concepto)')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching movimientos fondo by date:', error);
    throw new Error('No se pudieron cargar los movimientos del fondo');
  }

  return data as (FondoMovimiento & {
    eventos?: { nombre: string } | null;
    gastos?: { concepto: string } | null;
  })[];
}

/**
 * Calcula el saldo actual del fondo de empresa
 */
export async function getSaldoFondo(context: APIContext): Promise<number> {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('fondo_movimientos')
    .select('cantidad');

  if (error) {
    console.error('Error fetching saldo fondo:', error);
    throw new Error('No se pudo calcular el saldo del fondo');
  }

  const movimientos = data.map(m => Number(m.cantidad));
  return calcularSaldoFondo(movimientos);
}

/**
 * Registra un movimiento en el fondo de empresa
 * - Cantidad positiva = entrada al fondo
 * - Cantidad negativa = salida del fondo
 */
export async function registrarMovimientoFondo(
  context: APIContext,
  movimiento: FondoMovimientoInsert
) {
  const supabase = getSupabaseServerClient(context);
  
  console.log('Registrando movimiento en fondo:', JSON.stringify(movimiento, null, 2));
  
  const { data, error } = await supabase
    .from('fondo_movimientos')
    .insert(movimiento)
    .select()
    .single();

  if (error) {
    console.error('Error registering movimiento fondo:', error);
    throw new Error(`No se pudo registrar el movimiento: ${error.message}`);
  }

  console.log('Movimiento registrado exitosamente:', data);
  return data as FondoMovimiento;
}

/**
 * Reembolsa un gasto pagado por un socio
 * Usa la función RPC reembolsar_gasto que:
 * 1. Marca el gasto como reembolsado
 * 2. Crea un movimiento de salida en el fondo
 */
export async function reembolsarGasto(
  context: APIContext,
  gastoId: string,
  fecha?: string
) {
  const supabase = getSupabaseServerClient(context);
  
  console.log('Reembolsando gasto:', gastoId, 'fecha:', fecha);
  
  const params: any = { p_gasto_id: gastoId };
  if (fecha) {
    params.p_fecha = fecha;
  }
  
  const { error } = await supabase.rpc('reembolsar_gasto', params);

  if (error) {
    console.error('Error reembolsando gasto:', error);
    throw new Error(`No se pudo reembolsar el gasto: ${error.message}`);
  }

  console.log('Gasto reembolsado exitosamente');
}

/**
 * Registra una entrada al fondo desde el reparto de un evento
 */
export async function registrarEntradaFondoDesdeEvento(
  context: APIContext,
  eventoId: string,
  cantidad: number,
  fecha: string,
  concepto?: string
) {
  return registrarMovimientoFondo(context, {
    fecha,
    concepto: concepto || 'Entrada desde reparto de evento',
    cantidad, // positivo = entrada
    evento_id: eventoId,
  });
}

/**
 * Registra una salida del fondo (gasto de empresa)
 */
export async function registrarSalidaFondo(
  context: APIContext,
  cantidad: number,
  fecha: string,
  concepto: string,
  gastoId?: string
) {
  return registrarMovimientoFondo(context, {
    fecha,
    concepto,
    cantidad: -Math.abs(cantidad), // negativo = salida
    gasto_id: gastoId || null,
  });
}

/**
 * Obtiene el histórico de saldos del fondo mes a mes
 */
export async function getHistoricoSaldosFondo(context: APIContext, meses: number = 12) {
  const movimientos = await getMovimientosFondo(context);
  
  // Agrupar por mes y calcular saldo acumulado
  const mesesMap = new Map<string, { mes: string; saldo: number }>();
  let saldoAcumulado = 0;
  
  // Ordenar por fecha ascendente para calcular acumulado correctamente
  const movimientosOrdenados = [...movimientos].reverse();
  
  for (const mov of movimientosOrdenados) {
    const fecha = new Date(mov.fecha);
    const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    
    saldoAcumulado += Number(mov.cantidad);
    mesesMap.set(mesKey, { mes: mesKey, saldo: saldoAcumulado });
  }
  
  return Array.from(mesesMap.values())
    .sort((a, b) => b.mes.localeCompare(a.mes))
    .slice(0, meses);
}
