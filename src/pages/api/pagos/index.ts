import type { APIRoute } from 'astro';
import { createPago } from '../../../services/pagos';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    
    const pago = await createPago(context, {
      evento_id: body.evento_id,
      fecha: body.fecha,
      cantidad: body.cantidad,
      concepto: body.concepto || null,
    });

    return new Response(JSON.stringify(pago), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating pago:', error);
    return new Response(JSON.stringify({ error: 'Error al crear el pago' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
