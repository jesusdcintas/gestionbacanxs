import type { APIContext } from 'astro';
import { getSupabaseServerClient } from '../lib/supabase';
import type { Database } from '../types/database';
import { calcularNetoRepartibleEvento } from '../utils/finanzas';

type Evento = Database['public']['Tables']['eventos']['Row'];
type EventoInsert = Database['public']['Tables']['eventos']['Insert'];
type EventoUpdate = Database['public']['Tables']['eventos']['Update'];

export type EventoConEstadoReparto = Evento & {
  neto_repartible: number;
  total_repartido: number;
  pendiente_reparto: number;
  reparto_completo: boolean;
};

export async function getEventos(context: APIContext) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase.from('eventos').select('*').order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching eventos:', error);
    throw new Error('No se pudieron cargar los eventos');
  }

  return data as Evento[];
}

export async function getEventosConEstadoReparto(
  context: APIContext,
): Promise<EventoConEstadoReparto[]> {
  const supabase = getSupabaseServerClient(context);

  const [eventosRes, gastosRes, repartosRes] = await Promise.all([
    supabase.from('eventos').select('*').order('fecha', { ascending: false }),
    supabase
      .from('gastos')
      .select('evento_id, cantidad')
      .eq('tipo_gasto', 'directo_evento')
      .not('evento_id', 'is', null),
    supabase.from('repartos_evento').select('evento_id, cantidad'),
  ]);

  if (eventosRes.error || gastosRes.error || repartosRes.error) {
    console.error('Error fetching eventos con estado reparto:', {
      eventos: eventosRes.error,
      gastos: gastosRes.error,
      repartos: repartosRes.error,
    });
    throw new Error('No se pudieron cargar los eventos');
  }

  const gastosPorEvento = new Map<string, number>();
  for (const g of gastosRes.data ?? []) {
    if (!g.evento_id) continue;
    gastosPorEvento.set(
      g.evento_id,
      (gastosPorEvento.get(g.evento_id) ?? 0) + Number(g.cantidad),
    );
  }

  const repartidoPorEvento = new Map<string, number>();
  for (const r of repartosRes.data ?? []) {
    repartidoPorEvento.set(
      r.evento_id,
      (repartidoPorEvento.get(r.evento_id) ?? 0) + Number(r.cantidad),
    );
  }

  return (eventosRes.data ?? []).map((evento) => {
    const totalGastos = gastosPorEvento.get(evento.id) ?? 0;
    const totalRepartido = repartidoPorEvento.get(evento.id) ?? 0;
    const netoRepartible = calcularNetoRepartibleEvento(
      Number(evento.presupuesto),
      Boolean(evento.con_factura),
      Number(evento.retencion_irpf),
      totalGastos,
    );
    const pendienteReparto = netoRepartible - totalRepartido;

    return {
      ...evento,
      neto_repartible: netoRepartible,
      total_repartido: totalRepartido,
      pendiente_reparto: pendienteReparto,
      reparto_completo: pendienteReparto <= 0.01,
    };
  });
}

export async function getEvento(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase.from('eventos').select('*').eq('id', id).single();

  if (error) {
    console.error('Error fetching evento:', error);
    throw new Error('No se pudo cargar el evento');
  }

  return data as Evento;
}

export async function createEvento(context: APIContext, evento: EventoInsert) {
  const supabase = getSupabaseServerClient(context);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const eventoData = {
    ...evento,
    created_by: user?.id || null,
  };

  const { data, error } = await supabase.from('eventos').insert(eventoData).select().single();

  if (error) {
    console.error('Error de Supabase al crear evento:', error);
    throw new Error(`No se pudo crear el evento: ${error.message} (${error.code})`);
  }

  return data as Evento;
}

export async function updateEvento(context: APIContext, id: string, evento: EventoUpdate) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase.from('eventos').update(evento).eq('id', id).select().single();

  if (error) {
    console.error('Error de Supabase al actualizar evento:', error);
    throw new Error(`No se pudo actualizar el evento: ${error.message} (${error.code})`);
  }

  return data as Evento;
}

export async function deleteEvento(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);

  const { error } = await supabase.from('eventos').delete().eq('id', id);

  if (error) {
    console.error('Error deleting evento:', error);
    throw new Error('No se pudo eliminar el evento');
  }
}

export async function getEventoCompleto(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('eventos')
    .select(`
      *,
      pagos_evento(*),
      gastos(*, gasto_pagos(*, profiles(nombre))),
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

export async function cambiarEstadoEvento(
  context: APIContext,
  id: string,
  estadoFinanciero: Database['public']['Tables']['eventos']['Row']['estado_financiero'],
  estadoTrabajo: Database['public']['Tables']['eventos']['Row']['estado_trabajo'],
) {
  return updateEvento(context, id, {
    estado_financiero: estadoFinanciero,
    estado_trabajo: estadoTrabajo,
  });
}
