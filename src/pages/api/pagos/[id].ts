import type { APIRoute } from 'astro';
import { updatePago, deletePago } from '../../../services/pagos';

export const PUT: APIRoute = async (context) => {
  try {
    const { id } = context.params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID no proporcionado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json();
    
    const pago = await updatePago(context, id, {
      fecha: body.fecha,
      cantidad: body.cantidad,
      concepto: body.concepto || null,
    });

    return new Response(JSON.stringify(pago), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating pago:', error);
    return new Response(JSON.stringify({ error: 'Error al actualizar el pago' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    const { id } = context.params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID no proporcionado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await deletePago(context, id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting pago:', error);
    return new Response(JSON.stringify({ error: 'Error al eliminar el pago' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
