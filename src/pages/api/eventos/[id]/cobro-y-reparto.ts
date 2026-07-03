import type { APIRoute } from 'astro';
import { cobrarYRepartir } from '../../../../services/pagos';

export const POST: APIRoute = async (context) => {
  try {
    const { id } = context.params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID no proporcionado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json();
    const cantidad = Number(body?.cantidad);

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return new Response(JSON.stringify({ error: 'Cantidad inválida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!body?.recibido_por) {
      return new Response(JSON.stringify({ error: 'Debes seleccionar quién cobró' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await cobrarYRepartir(context, {
      evento_id: id,
      fecha: String(body?.fecha || new Date().toISOString().slice(0, 10)),
      cantidad,
      recibido_por: String(body.recibido_por),
      metodo_pago: body?.metodo_pago === 'efectivo' ? 'efectivo' : 'banco',
      concepto_pago: body?.concepto_pago ? String(body.concepto_pago) : null,
      repartos: Array.isArray(body?.repartos) ? body.repartos : [],
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error cobrando y repartiendo:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error al cobrar y repartir' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};