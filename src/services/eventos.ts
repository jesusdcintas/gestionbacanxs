import type { APIContext } from 'astro';
import { getSupabaseServerClient } from '../lib/supabase';
import type { Database } from '../types/database';

type Evento = Database['public']['Tables']['eventos']['Row'];
type EventoInsert = Database['public']['Tables']['eventos']['Insert'];
type EventoUpdate = Database['public']['Tables']['eventos']['Update'];

export async function getEventos(context: APIContext) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching eventos:', error);
    throw new Error('No se pudieron cargar los eventos');
  }

  return data as Evento[];
}

export async function getEvento(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching evento:', error);
    throw new Error('No se pudo cargar el evento');
  }

  return data as Evento;
}

export async function createEvento(context: APIContext, evento: EventoInsert) {
  const supabase = getSupabaseServerClient(context);
  
  // Obtener el usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  
  const eventoData = {
    ...evento,
    created_by: user?.id || null,
  };
  
  console.log('Insertando evento en Supabase:', JSON.stringify(eventoData, null, 2));
  
  const { data, error } = await supabase
    .from('eventos')
    .insert(eventoData)
    .select()
    .single();

  if (error) {
    console.error('Error de Supabase al crear evento:', error);
    console.error('Código de error:', error.code);
    console.error('Mensaje:', error.message);
    console.error('Detalles:', error.details);
    throw new Error(`No se pudo crear el evento: ${error.message} (${error.code})`);
  }

  console.log('Evento creado exitosamente:', data);
  return data as Evento;
}

export async function updateEvento(context: APIContext, id: string, evento: EventoUpdate) {
  const supabase = getSupabaseServerClient(context);
  
  console.log('Actualizando evento en Supabase:', id, JSON.stringify(evento, null, 2));
  
  const { data, error } = await supabase
    .from('eventos')
    .update(evento)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error de Supabase al actualizar evento:', error);
    console.error('Código de error:', error.code);
    console.error('Mensaje:', error.message);
    console.error('Detalles:', error.details);
    throw new Error(`No se pudo actualizar el evento: ${error.message} (${error.code})`);
  }

  console.log('Evento actualizado exitosamente:', data);
  return data as Evento;
}

export async function deleteEvento(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);
  
  const { error } = await supabase
    .from('eventos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting evento:', error);
    throw new Error('No se pudo eliminar el evento');
  }
}

/**
 * Obtiene un evento completo con toda su información relacionada
 * Incluye: pagos recibidos, gastos, repartos y cálculos financieros
 */
export async function getEventoCompleto(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);
  
  // Obtener evento con pagos, gastos y repartos en una sola query
  const { data, error } = await supabase
    .from('eventos')
    .select(`
      *,
      pagos_evento(*),
      gastos(*, profiles!gastos_pagado_por_fkey(nombre)),
      repartos_evento(*, profiles(nombre))
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching evento completo:', error);
    throw new Error('No se pudo cargar el evento completo');
  }

  return data;
}

/**
 * Cambia el estado de un evento
 */
export async function cambiarEstadoEvento(
  context: APIContext,
  id: string,
  estado: 'pendiente' | 'confirmado' | 'completado' | 'cancelado'
) {
  return updateEvento(context, id, { estado });
}
