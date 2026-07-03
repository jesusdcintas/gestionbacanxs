import type { APIRoute } from 'astro';
import { editarRepartoEvento, eliminarRepartoEvento } from '../../../../services/repartos';

export const PUT: APIRoute = async (context) => {
  try {
    const { eventoId, repartoId } = context.params;
    if (!eventoId || !repartoId) {
      return new Response(JSON.stringify({ error: 'ID no proporcionado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json();
    const cantidad = Number(body?.cantidad);

    if (!Number.isFinite(cantidad)) {
      return new Response(JSON.stringify({ error: 'Cantidad inválida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await editarRepartoEvento(context, repartoId, {
      fecha: String(body?.fecha || new Date().toISOString().slice(0, 10)),
      concepto: body?.concepto ? String(body.concepto) : null,
      cantidad,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error editando reparto:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error al editar el reparto' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    const { eventoId, repartoId } = context.params;
    if (!eventoId || !repartoId) {
      return new Response(JSON.stringify({ error: 'ID no proporcionado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await eliminarRepartoEvento(context, repartoId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error eliminando reparto:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error al eliminar el reparto' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};