import type { APIContext } from 'astro';
import { getSupabaseServerClient } from '../lib/supabase';
import type { Database } from '../types/database';

type RepartoEvento = Database['public']['Tables']['repartos_evento']['Row'];

export interface RepartoInput {
  socio_id: string | null; // null = fondo de empresa
  cantidad: number;
}

export interface RegistrarRepartoInput {
  fecha: string;
  concepto: string | null;
  repartos: RepartoInput[];
}

/**
 * Obtiene los repartos de un evento específico
 */
export async function getRepartosByEvento(context: APIContext, eventoId: string) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('repartos_evento')
    .select('*, profiles(nombre)')
    .eq('evento_id', eventoId)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching repartos:', error);
    throw new Error('No se pudieron cargar los repartos del evento');
  }

  return data as (RepartoEvento & { profiles?: { nombre: string } | null })[];
}

/**
 * Registra una nueva tanda de reparto para un evento (acumulativo/histórico).
 * Usa la función RPC registrar_reparto_evento para operación atómica.
 */
export async function registrarRepartoEvento(
  context: APIContext,
  eventoId: string,
  input: RegistrarRepartoInput,
) {
  const supabase = getSupabaseServerClient(context);

  const repartos = input.repartos.filter((r) => r.cantidad > 0);
  if (repartos.length === 0) {
    throw new Error('Debes indicar al menos una cantidad mayor que 0 en esta tanda');
  }

  console.log('Registrando reparto para evento:', eventoId);
  console.log('Fecha:', input.fecha, 'Concepto:', input.concepto);
  console.log('Repartos:', JSON.stringify(repartos, null, 2));

  const { error } = await supabase.rpc('registrar_reparto_evento', {
    p_evento_id: eventoId,
    p_fecha: input.fecha,
    p_concepto: input.concepto,
    p_repartos: repartos as any, // jsonb
  });

  if (error) {
    console.error('Error registrando reparto:', error);
    throw new Error(`No se pudo registrar la tanda de reparto: ${error.message}`);
  }

  console.log('Tanda de reparto registrada exitosamente');
}

/**
 * Obtiene el total ya repartido en un evento (histórico acumulado)
 */
export async function getTotalRepartidoEvento(
  context: APIContext,
  eventoId: string,
): Promise<number> {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('repartos_evento')
    .select('cantidad')
    .eq('evento_id', eventoId);

  if (error) {
    console.error('Error fetching total repartido evento:', error);
    throw new Error('No se pudo calcular el total repartido del evento');
  }

  return data.reduce((sum, item) => sum + Number(item.cantidad), 0);
}

/**
 * Obtiene el total repartido a un socio específico (en todos los eventos)
 */
export async function getTotalRepartidoSocio(context: APIContext, socioId: string): Promise<number> {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('repartos_evento')
    .select('cantidad')
    .eq('socio_id', socioId);

  if (error) {
    console.error('Error fetching total repartido socio:', error);
    throw new Error('No se pudo calcular el total repartido al socio');
  }

  return data.reduce((total, reparto) => total + Number(reparto.cantidad), 0);
}

/**
 * Obtiene el total repartido al fondo de empresa (en todos los eventos)
 */
export async function getTotalRepartidoFondo(context: APIContext): Promise<number> {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('repartos_evento')
    .select('cantidad')
    .is('socio_id', null); // null = fondo de empresa

  if (error) {
    console.error('Error fetching total repartido fondo:', error);
    throw new Error('No se pudo calcular el total repartido al fondo');
  }

  return data.reduce((total, reparto) => total + Number(reparto.cantidad), 0);
}

/**
 * Elimina todos los repartos de un evento
 * (normalmente se usa guardarReparto que reemplaza, pero esto puede ser útil)
 */
export async function deleteRepartosByEvento(context: APIContext, eventoId: string) {
  const supabase = getSupabaseServerClient(context);
  
  const { error } = await supabase
    .from('repartos_evento')
    .delete()
    .eq('evento_id', eventoId);

  if (error) {
    console.error('Error deleting repartos:', error);
    throw new Error('No se pudieron eliminar los repartos');
  }
}
