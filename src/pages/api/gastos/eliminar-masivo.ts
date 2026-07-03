import type { APIRoute } from 'astro';
import { eliminarGastosMasivo } from '../../../services/gastos';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const gastoIds = Array.isArray(body?.gasto_ids) ? body.gasto_ids.filter(Boolean).map(String) : [];

    if (gastoIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Debes seleccionar al menos un gasto' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await eliminarGastosMasivo(context, gastoIds);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting gastos masivo:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error al eliminar los gastos seleccionados' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};