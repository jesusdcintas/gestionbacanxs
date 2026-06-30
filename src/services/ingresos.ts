import type { APIContext } from 'astro';
import { getSupabaseServerClient } from '../lib/supabase';
import type { Database } from '../types/database';

type Ingreso = Database['public']['Tables']['ingresos']['Row'];
type IngresoInsert = Database['public']['Tables']['ingresos']['Insert'];
type IngresoUpdate = Database['public']['Tables']['ingresos']['Update'];

export async function getIngresos(context: APIContext) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('ingresos')
    .select('*, eventos(nombre)')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching ingresos:', error);
    throw new Error('No se pudieron cargar los ingresos');
  }

  return data as (Ingreso & { eventos?: { nombre: string } | null })[];
}

export async function getIngreso(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('ingresos')
    .select('*, eventos(nombre)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching ingreso:', error);
    throw new Error('No se pudo cargar el ingreso');
  }

  return data as Ingreso & { eventos?: { nombre: string } | null };
}

export async function createIngreso(context: APIContext, ingreso: IngresoInsert) {
  const supabase = getSupabaseServerClient(context);
  
  // Obtener el usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  
  const ingresoData = {
    ...ingreso,
    created_by: user?.id || null,
  };
  
  const { data, error } = await supabase
    .from('ingresos')
    .insert(ingresoData)
    .select()
    .single();

  if (error) {
    console.error('Error creating ingreso:', error);
    throw new Error('No se pudo crear el ingreso');
  }

  return data as Ingreso;
}

export async function updateIngreso(context: APIContext, id: string, ingreso: IngresoUpdate) {
  const supabase = getSupabaseServerClient(context);
  
  console.log('Actualizando ingreso en Supabase:', id, JSON.stringify(ingreso, null, 2));
  
  const { data, error } = await supabase
    .from('ingresos')
    .update(ingreso)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error de Supabase al actualizar ingreso:', error);
    console.error('Código de error:', error.code);
    console.error('Mensaje:', error.message);
    console.error('Detalles:', error.details);
    throw new Error(`No se pudo actualizar el ingreso: ${error.message} (${error.code})`);
  }

  console.log('Ingreso actualizado exitosamente:', data);
  return data as Ingreso;
}

export async function deleteIngreso(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);
  
  const { error } = await supabase
    .from('ingresos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting ingreso:', error);
    throw new Error('No se pudo eliminar el ingreso');
  }
}
