import type { APIRoute } from 'astro';
import { deleteEvento } from '../../../services/eventos';

export const DELETE: APIRoute = async (context) => {
  try {
    const { id } = context.params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID no proporcionado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await deleteEvento(context, id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting evento:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error al eliminar el evento',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};

export const POST: APIRoute = async (context) => {
  try {
    const { id } = context.params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID no proporcionado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await deleteEvento(context, id);
    return context.redirect('/eventos', 303);
  } catch (error) {
    console.error('Error deleting evento:', error);
    const message = error instanceof Error ? error.message : 'Error al eliminar el evento';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
