import type { APIRoute } from 'astro';
import { getFacturaSignedUrl } from '../../../../services/gastos';

export const GET: APIRoute = async (context) => {
  const { id } = context.params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Falta el id del gasto' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = await getFacturaSignedUrl(context, id);

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo generar la URL de la factura';

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
