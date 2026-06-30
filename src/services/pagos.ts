import type { APIContext } from 'astro';
import { getSupabaseServerClient } from '../lib/supabase';
import type { Database } from '../types/database';

type PagoEvento = Database['public']['Tables']['pagos_evento']['Row'];
type PagoEventoInsert = Database['public']['Tables']['pagos_evento']['Insert'];
type PagoEventoUpdate = Database['public']['Tables']['pagos_evento']['Update'];

/**
 * Obtiene todos los pagos de un evento específico
 */
export async function getPagosByEvento(context: APIContext, eventoId: string) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('pagos_evento')
    .select('*')
    .eq('evento_id', eventoId)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching pagos:', error);
    throw new Error('No se pudieron cargar los pagos del evento');
  }

  return data as PagoEvento[];
}

/**
 * Obtiene un pago específico por ID
 */
export async function getPago(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('pagos_evento')
    .select('*, eventos(nombre)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching pago:', error);
    throw new Error('No se pudo cargar el pago');
  }

  return data as PagoEvento & { eventos?: { nombre: string } | null };
}

/**
 * Crea un nuevo pago para un evento
 */
export async function createPago(context: APIContext, pago: PagoEventoInsert) {
  const supabase = getSupabaseServerClient(context);
  
  // Obtener el usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  
  const pagoData = {
    ...pago,
    created_by: user?.id || null,
  };
  
  console.log('Insertando pago en Supabase:', JSON.stringify(pagoData, null, 2));
  
  const { data, error } = await supabase
    .from('pagos_evento')
    .insert(pagoData)
    .select()
    .single();

  if (error) {
    console.error('Error creating pago:', error);
    throw new Error(`No se pudo crear el pago: ${error.message}`);
  }

  console.log('Pago creado exitosamente:', data);
  return data as PagoEvento;
}

/**
 * Actualiza un pago existente
 */
export async function updatePago(context: APIContext, id: string, pago: PagoEventoUpdate) {
  const supabase = getSupabaseServerClient(context);
  
  console.log('Actualizando pago en Supabase:', id, JSON.stringify(pago, null, 2));
  
  const { data, error } = await supabase
    .from('pagos_evento')
    .update(pago)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating pago:', error);
    throw new Error(`No se pudo actualizar el pago: ${error.message}`);
  }

  console.log('Pago actualizado exitosamente:', data);
  return data as PagoEvento;
}

/**
 * Elimina un pago
 */
export async function deletePago(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);
  
  const { error } = await supabase
    .from('pagos_evento')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting pago:', error);
    throw new Error('No se pudo eliminar el pago');
  }
}

/**
 * Calcula el total pagado de un evento (suma de todos sus pagos)
 */
export async function getTotalPagadoEvento(context: APIContext, eventoId: string): Promise<number> {
  const pagos = await getPagosByEvento(context, eventoId);
  return pagos.reduce((total, pago) => total + Number(pago.cantidad), 0);
}
