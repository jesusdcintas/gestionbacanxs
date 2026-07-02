import type { APIContext } from 'astro';
import { getSupabaseServerClient } from '../lib/supabase';
import type { Database } from '../types/database';

type Gasto = Database['public']['Tables']['gastos']['Row'];
type GastoInsert = Database['public']['Tables']['gastos']['Insert'];
type GastoUpdate = Database['public']['Tables']['gastos']['Update'];
type GastoPago = Database['public']['Tables']['gasto_pagos']['Row'];
export type TipoGasto = 'directo_evento' | 'inversion_empresa';

export interface FuentePagoInput {
  socio_id: string | null;
  cantidad: number;
}

export type GastoConFuentes = Gasto & {
  eventos?: { nombre: string } | null;
  gasto_pagos?: (GastoPago & { profiles?: { nombre: string } | null })[];
};

export const CATEGORIAS_GASTO = [
  'Transporte',
  'Alojamiento',
  'Comida',
  'Equipamiento',
  'Promoción',
  'Servicios',
  'Otros',
] as const;

const GASTO_SELECT = `
  *,
  eventos(nombre),
  gasto_pagos(*, profiles(nombre))
`;

export async function getGastos(context: APIContext) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('gastos')
    .select(GASTO_SELECT)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos:', error);
    throw new Error('No se pudieron cargar los gastos');
  }

  return data as GastoConFuentes[];
}

export async function getGasto(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('gastos')
    .select(GASTO_SELECT)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching gasto:', error);
    throw new Error('No se pudo cargar el gasto');
  }

  return data as GastoConFuentes;
}

/**
 * Guarda gasto + fuentes de pago de forma atómica.
 * Si gastoId es null, crea gasto nuevo. Si existe, actualiza gasto existente.
 */
export async function guardarGastoConPagos(
  context: APIContext,
  gastoData: GastoInsert | GastoUpdate,
  fuentesPago: FuentePagoInput[],
  gastoId: string | null = null,
) {
  const supabase = getSupabaseServerClient(context);

  const fuentes = fuentesPago
    .map((f) => ({
      socio_id: f.socio_id,
      cantidad: Number(f.cantidad),
    }))
    .filter((f) => f.cantidad > 0);

  if (fuentes.length === 0) {
    throw new Error('Debes indicar al menos una fuente de pago con cantidad mayor a 0');
  }

  const totalFuentes = fuentes.reduce((sum, f) => sum + f.cantidad, 0);
  const cantidadGasto = Number(gastoData.cantidad ?? 0);
  const tipoGasto = (gastoData.tipo_gasto ?? 'directo_evento') as TipoGasto;
  const eventoId = gastoData.evento_id ?? null;

  if (tipoGasto === 'directo_evento' && !eventoId) {
    throw new Error('Los gastos directos de evento deben estar vinculados a un evento.');
  }

  if (Math.abs(totalFuentes - cantidadGasto) > 0.01) {
    throw new Error(
      `Las fuentes de pago (${totalFuentes.toFixed(2)}€) no coinciden con la cantidad del gasto (${cantidadGasto.toFixed(2)}€).`,
    );
  }

  const { data, error } = await supabase.rpc('guardar_gasto_con_pagos', {
    p_gasto_id: gastoId,
    p_concepto: String(gastoData.concepto || ''),
    p_cantidad: cantidadGasto,
    p_categoria: String(gastoData.categoria || 'Otros'),
    p_tipo_gasto: tipoGasto,
    p_fecha: String(gastoData.fecha || new Date().toISOString().slice(0, 10)),
    p_evento_id: eventoId,
    p_reembolsado: Boolean(gastoData.reembolsado ?? false),
    p_fuentes: fuentes as any,
  });

  if (error) {
    console.error('Error guardando gasto con pagos:', error);
    throw new Error(`No se pudo guardar el gasto: ${error.message}`);
  }

  const gastoGuardadoId = String(data);
  return getGasto(context, gastoGuardadoId);
}

// Wrappers de compatibilidad
export async function createGasto(
  context: APIContext,
  gasto: GastoInsert,
  fuentesPago: FuentePagoInput[],
) {
  return guardarGastoConPagos(context, gasto, fuentesPago, null);
}

export async function updateGasto(
  context: APIContext,
  id: string,
  gasto: GastoUpdate,
  fuentesPago: FuentePagoInput[],
) {
  return guardarGastoConPagos(context, gasto, fuentesPago, id);
}

export async function deleteGasto(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);

  const { error } = await supabase.from('gastos').delete().eq('id', id);

  if (error) {
    console.error('Error deleting gasto:', error);
    throw new Error('No se pudo eliminar el gasto');
  }
}

export async function getGastosByEvento(context: APIContext, eventoId: string) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('gastos')
    .select('*, gasto_pagos(*, profiles(nombre))')
    .eq('evento_id', eventoId)
    .eq('tipo_gasto', 'directo_evento')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos by evento:', error);
    throw new Error('No se pudieron cargar los gastos del evento');
  }

  return data as (Gasto & {
    gasto_pagos?: (GastoPago & { profiles?: { nombre: string } | null })[];
  })[];
}

export async function getGastosGenerales(context: APIContext) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('gastos')
    .select('*, gasto_pagos(*, profiles(nombre))')
    .is('evento_id', null)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos generales:', error);
    throw new Error('No se pudieron cargar los gastos generales');
  }

  return data as (Gasto & {
    gasto_pagos?: (GastoPago & { profiles?: { nombre: string } | null })[];
  })[];
}

export async function getGastosPendientesReembolso(context: APIContext) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('gastos')
    .select('*, eventos(nombre), gasto_pagos(*, profiles(nombre))')
    .eq('reembolsado', false)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos pendientes reembolso:', error);
    throw new Error('No se pudieron cargar los gastos pendientes de reembolso');
  }

  // Solo pendientes con aportación de socios (socio_id != null)
  return (data as any[]).filter((g) =>
    (g.gasto_pagos ?? []).some((gp: any) => gp.socio_id !== null),
  ) as GastoConFuentes[];
}

export async function getTotalGastosEvento(context: APIContext, eventoId: string): Promise<number> {
  const gastos = await getGastosByEvento(context, eventoId);
  return gastos.reduce((total, gasto) => total + Number(gasto.cantidad), 0);
}
