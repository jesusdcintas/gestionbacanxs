import type { APIRoute } from 'astro';
import { cambiarPagadorMasivo } from '../../../services/gastos';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const gastoIds = Array.isArray(body?.gasto_ids) ? body.gasto_ids.filter(Boolean).map(String) : [];
    const socioId = body?.socio_id ? String(body.socio_id) : null;

    if (gastoIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Debes seleccionar al menos un gasto' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await cambiarPagadorMasivo(context, gastoIds, socioId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error cambiando pagador masivo:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error al cambiar el pagador' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};