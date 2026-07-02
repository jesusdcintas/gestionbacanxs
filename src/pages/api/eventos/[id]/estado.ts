import type { APIRoute } from 'astro';
import type { Database } from '../../../../types/database';
import { cambiarEstadoEvento } from '../../../../services/eventos';

type EstadoFinanciero = Database['public']['Tables']['eventos']['Row']['estado_financiero'];
type EstadoTrabajo = Database['public']['Tables']['eventos']['Row']['estado_trabajo'];

const ESTADOS_FINANCIEROS: EstadoFinanciero[] = ['no_pagado', 'parcialmente_pagado', 'pagado'];
const ESTADOS_TRABAJO: EstadoTrabajo[] = ['confirmado', 'realizado', 'cancelado'];

function isEstadoFinanciero(value: string): value is EstadoFinanciero {
  return ESTADOS_FINANCIEROS.includes(value as EstadoFinanciero);
}

function isEstadoTrabajo(value: string): value is EstadoTrabajo {
  return ESTADOS_TRABAJO.includes(value as EstadoTrabajo);
}

export const POST: APIRoute = async (context) => {
  try {
    const { id } = context.params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID no proporcionado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType = context.request.headers.get('content-type') || '';
    let estadoFinancieroRaw = '';
    let estadoTrabajoRaw = '';
    let redirectTo = `/eventos/${id}/detalle`;

    if (contentType.includes('application/json')) {
      const body = await context.request.json();
      estadoFinancieroRaw = String(body?.estado_financiero || '');
      estadoTrabajoRaw = String(body?.estado_trabajo || '');
    } else {
      const formData = await context.request.formData();
      estadoFinancieroRaw = String(formData.get('estado_financiero') || '');
      estadoTrabajoRaw = String(formData.get('estado_trabajo') || '');
      redirectTo = String(formData.get('redirect_to') || redirectTo);
    }

    if (!isEstadoFinanciero(estadoFinancieroRaw) || !isEstadoTrabajo(estadoTrabajoRaw)) {
      return new Response(JSON.stringify({ error: 'Estado no válido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await cambiarEstadoEvento(context, id, estadoFinancieroRaw, estadoTrabajoRaw);

    if (contentType.includes('application/json')) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return context.redirect(redirectTo, 303);
  } catch (error) {
    console.error('Error actualizando estados del evento:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error actualizando estados del evento',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};
