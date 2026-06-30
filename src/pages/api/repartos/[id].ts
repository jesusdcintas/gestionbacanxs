import type { APIRoute } from 'astro';
import { guardarReparto } from '../../../services/repartos';

export const POST: APIRoute = async (context) => {
  try {
    const { id } = context.params; // evento_id
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID no proporcionado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json();
    
    await guardarReparto(context, id, body.repartos);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error guardando reparto:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Error al guardar el reparto' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
