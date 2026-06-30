import type { APIContext } from 'astro';
import { getSupabaseServerClient } from '../lib/supabase';
import type { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

/**
 * Obtiene todos los perfiles (socios)
 */
export async function getProfiles(context: APIContext) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('nombre');

  if (error) {
    console.error('Error fetching profiles:', error);
    throw new Error('No se pudieron cargar los perfiles');
  }

  return data as Profile[];
}

/**
 * Obtiene un perfil específico por ID
 */
export async function getProfile(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    throw new Error('No se pudo cargar el perfil');
  }

  return data as Profile;
}

/**
 * Obtiene el perfil del usuario actual
 */
export async function getCurrentProfile(context: APIContext) {
  const supabase = getSupabaseServerClient(context);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  return getProfile(context, user.id);
}

/**
 * Crea un nuevo perfil
 */
export async function createProfile(context: APIContext, profile: ProfileInsert) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
    throw new Error('No se pudo crear el perfil');
  }

  return data as Profile;
}

/**
 * Actualiza un perfil existente
 */
export async function updateProfile(context: APIContext, id: string, profile: ProfileUpdate) {
  const supabase = getSupabaseServerClient(context);
  
  const { data, error } = await supabase
    .from('profiles')
    .update(profile)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw new Error('No se pudo actualizar el perfil');
  }

  return data as Profile;
}

/**
 * Elimina un perfil
 */
export async function deleteProfile(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);
  
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting profile:', error);
    throw new Error('No se pudo eliminar el perfil');
  }
}
