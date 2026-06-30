import type { APIRoute } from 'astro';
import { registrarMovimientoFondo } from '../../../services/fondo';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();

    if (typeof body.cantidad !== 'number' || body.cantidad === 0) {
      return new Response(JSON.stringify({ error: 'La cantidad debe ser distinta de 0' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!body.fecha || !body.concepto) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const movimiento = await registrarMovimientoFondo(context, {
      fecha: body.fecha,
      concepto: body.concepto,
      cantidad: body.cantidad,
      evento_id: null,
      gasto_id: null,
    });

    return new Response(JSON.stringify(movimiento), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error registering movimiento fondo:', error);
    const message = error instanceof Error ? error.message : 'Error al registrar el movimiento';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
