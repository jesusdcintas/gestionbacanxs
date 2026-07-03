import type { APIRoute } from 'astro';
import { cambiarReceptorMasivo } from '../../../services/ingresos';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const pagoIds = Array.isArray(body?.pago_ids) ? body.pago_ids.filter(Boolean).map(String) : [];
    const socioId = body?.socio_id ? String(body.socio_id) : null;

    if (pagoIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Debes seleccionar al menos un ingreso' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await cambiarReceptorMasivo(context, pagoIds, socioId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error cambiando receptor masivo:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error al cambiar el receptor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};