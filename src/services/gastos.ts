import type { APIContext } from 'astro';
import { getSupabaseServerClient } from '../lib/supabase';
import type { Database } from '../types/database';

type Gasto = Database['public']['Tables']['gastos']['Row'];
type GastoInsert = Database['public']['Tables']['gastos']['Insert'];
type GastoUpdate = Database['public']['Tables']['gastos']['Update'];

export const CATEGORIAS_GASTO = [
  'Transporte',
  'Alojamiento',
  'Comida',
  'Equipamiento',
  'Promoción',
  'Servicios',
  'Otros',
] as const;

export async function getGastos(context: APIContext) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('gastos')
    .select('*, eventos(nombre), profiles!gastos_pagado_por_fkey(nombre)')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos:', error);
    throw new Error('No se pudieron cargar los gastos');
  }

  return data as (Gasto & { 
    eventos?: { nombre: string } | null;
    profiles?: { nombre: string } | null;
  })[];
}

export async function getGasto(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('gastos')
    .select('*, eventos(nombre), profiles!gastos_pagado_por_fkey(nombre)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching gasto:', error);
    throw new Error('No se pudo cargar el gasto');
  }

  return data as Gasto & {
    eventos?: { nombre: string } | null;
    profiles?: { nombre: string } | null;
  };
}

export async function createGasto(context: APIContext, gasto: GastoInsert) {
  const supabase = getSupabaseServerClient(context);
  
  // Obtener el usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  
  const gastoData = {
    ...gasto,
    created_by: user?.id || null,
  };
  
  const { data, error } = await supabase
    .from('gastos')
    .insert(gastoData)
    .select()
    .single();

  if (error) {
    console.error('Error creating gasto:', error);
    throw new Error('No se pudo crear el gasto');
  }

  return data as Gasto;
}

export async function updateGasto(context: APIContext, id: string, gasto: GastoUpdate) {
  const supabase = getSupabaseServerClient(context);
  
  console.log('Actualizando gasto en Supabase:', id, JSON.stringify(gasto, null, 2));
  
  const { data, error } = await supabase
    .from('gastos')
    .update(gasto)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error de Supabase al actualizar gasto:', error);
    console.error('Código de error:', error.code);
    console.error('Mensaje:', error.message);
    console.error('Detalles:', error.details);
    throw new Error(`No se pudo actualizar el gasto: ${error.message} (${error.code})`);
  }

  console.log('Gasto actualizado exitosamente:', data);
  return data as Gasto;
}

export async function deleteGasto(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);
  
  const { error } = await supabase
    .from('gastos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting gasto:', error);
    throw new Error('No se pudo eliminar el gasto');
  }
}

/**
 * Obtiene los gastos de un evento específico
 */
export async function getGastosByEvento(context: APIContext, eventoId: string) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('gastos')
    .select('*, profiles!gastos_pagado_por_fkey(nombre)')
    .eq('evento_id', eventoId)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos by evento:', error);
    throw new Error('No se pudieron cargar los gastos del evento');
  }

  return data as (Gasto & { profiles?: { nombre: string } | null })[];
}

/**
 * Obtiene gastos generales (sin evento asociado)
 */
export async function getGastosGenerales(context: APIContext) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('gastos')
    .select('*, profiles!gastos_pagado_por_fkey(nombre)')
    .is('evento_id', null)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos generales:', error);
    throw new Error('No se pudieron cargar los gastos generales');
  }

  return data as (Gasto & { profiles?: { nombre: string } | null })[];
}

/**
 * Obtiene gastos pagados por la empresa (pagado_por = null)
 */
export async function getGastosPagadosEmpresa(context: APIContext) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('gastos')
    .select('*, eventos(nombre)')
    .is('pagado_por', null)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos pagados empresa:', error);
    throw new Error('No se pudieron cargar los gastos pagados por la empresa');
  }

  return data as (Gasto & { eventos?: { nombre: string } | null })[];
}

/**
 * Obtiene gastos pagados por socios (pagado_por != null)
 */
export async function getGastosPagadosSocios(context: APIContext) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('gastos')
    .select('*, eventos(nombre), profiles!gastos_pagado_por_fkey(nombre)')
    .not('pagado_por', 'is', null)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos pagados socios:', error);
    throw new Error('No se pudieron cargar los gastos pagados por socios');
  }

  return data as (Gasto & { 
    eventos?: { nombre: string } | null;
    profiles?: { nombre: string } | null;
  })[];
}

/**
 * Obtiene gastos pendientes de reembolso (pagado_por != null y reembolsado = false)
 */
export async function getGastosPendientesReembolso(context: APIContext) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('gastos')
    .select('*, eventos(nombre), profiles!gastos_pagado_por_fkey(nombre)')
    .not('pagado_por', 'is', null)
    .eq('reembolsado', false)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos pendientes reembolso:', error);
    throw new Error('No se pudieron cargar los gastos pendientes de reembolso');
  }

  return data as (Gasto & { 
    eventos?: { nombre: string } | null;
    profiles?: { nombre: string } | null;
  })[];
}

/**
 * Calcula el total de gastos de un evento
 */
export async function getTotalGastosEvento(context: APIContext, eventoId: string): Promise<number> {
  const gastos = await getGastosByEvento(context, eventoId);
  return gastos.reduce((total, gasto) => total + Number(gasto.cantidad), 0);
}
