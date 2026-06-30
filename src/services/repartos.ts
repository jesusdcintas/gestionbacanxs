import type { APIContext } from 'astro';
import { getSupabaseServerClient } from '../lib/supabase';
import type { Database } from '../types/database';

type RepartoEvento = Database['public']['Tables']['repartos_evento']['Row'];

export interface RepartoInput {
  socio_id: string | null; // null = fondo de empresa
  cantidad: number;
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
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching repartos:', error);
    throw new Error('No se pudieron cargar los repartos del evento');
  }

  return data as (RepartoEvento & { profiles?: { nombre: string } | null })[];
}

/**
 * Guarda el reparto de un evento (reemplaza los anteriores)
 * Usa la función RPC guardar_reparto_evento para hacerlo atómicamente.
 * Además, sincroniza el movimiento en fondo_movimientos correspondiente al reparto al fondo.
 */
export async function guardarReparto(
  context: APIContext,
  eventoId: string,
  repartos: RepartoInput[]
) {
  const supabase = getSupabaseServerClient(context);

  console.log('Guardando reparto para evento:', eventoId);
  console.log('Repartos:', JSON.stringify(repartos, null, 2));

  // Llamar a la función RPC que hace el delete + insert atómicamente
  const { error } = await supabase.rpc('guardar_reparto_evento', {
    p_evento_id: eventoId,
    p_repartos: repartos as any, // jsonb
  });

  if (error) {
    console.error('Error guardando reparto:', error);
    throw new Error(`No se pudo guardar el reparto: ${error.message}`);
  }

  // Sincronizar fondo_movimientos: eliminar antiguos asociados al evento sin gasto_id
  // (los de tipo "Entrada desde reparto") y crear uno nuevo si hay aporte al fondo
  await supabase
    .from('fondo_movimientos')
    .delete()
    .eq('evento_id', eventoId)
    .is('gasto_id', null);

  const aporteFondo = repartos.find((r) => r.socio_id === null);
  if (aporteFondo && aporteFondo.cantidad > 0) {
    const { data: evento } = await supabase
      .from('eventos')
      .select('nombre, fecha')
      .eq('id', eventoId)
      .single();

    const fecha = evento?.fecha ?? new Date().toISOString().split('T')[0];
    const concepto = evento?.nombre
      ? `Reparto del evento "${evento.nombre}" al fondo`
      : 'Entrada desde reparto de evento';

    const { error: fondoError } = await supabase.from('fondo_movimientos').insert({
      evento_id: eventoId,
      gasto_id: null,
      fecha,
      concepto,
      cantidad: aporteFondo.cantidad,
    });

    if (fondoError) {
      console.error('Error sincronizando movimiento del fondo:', fondoError);
      // No abortamos: el reparto ya quedó guardado
    }
  }

  console.log('Reparto guardado exitosamente');
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
