import type { APIContext } from 'astro';
import { getSupabaseServerClient } from '../lib/supabase';
import type { Database } from '../types/database';

type EventoTrabajador = Database['public']['Tables']['evento_trabajadores']['Row'];

export async function getTrabajadoresByEvento(context: APIContext, eventoId: string) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('evento_trabajadores')
    .select('socio_id, created_at, profiles(nombre)')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching trabajadores del evento:', error);
    throw new Error('No se pudieron cargar los trabajadores del evento');
  }

  return data as Array<
    EventoTrabajador & {
      profiles?: { nombre: string } | null;
    }
  >;
}

export async function syncTrabajadoresEvento(
  context: APIContext,
  eventoId: string,
  sociosSeleccionados: string[],
) {
  const supabase = getSupabaseServerClient(context);

  const unicos = Array.from(new Set(sociosSeleccionados.filter(Boolean)));

  const { error } = await supabase.rpc('sync_evento_trabajadores', {
    p_evento_id: eventoId,
    p_socios: unicos,
  });

  if (error) {
    console.error('Error sincronizando trabajadores del evento:', error);
    throw new Error(`No se pudieron guardar los trabajadores del evento: ${error.message}`);
  }
}

export async function getResumenTrabajoSocios(
  context: APIContext,
  fechaDesde?: string | null,
  fechaHasta?: string | null,
) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase.rpc('resumen_trabajo_socios', {
    p_fecha_desde: fechaDesde ?? null,
    p_fecha_hasta: fechaHasta ?? null,
  });

  if (error) {
    console.error('Error obteniendo resumen de trabajo de socios:', error);
    throw new Error(`No se pudo cargar el resumen de trabajo: ${error.message}`);
  }

  return data as Array<{
    socio_id: string;
    socio_nombre: string;
    eventos_trabajados: number;
  }>;
}
