import type { APIRoute } from 'astro';
import { eliminarGasto } from '../../../services/gastos';

export const DELETE: APIRoute = async (context) => {
  try {
    const { id } = context.params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID no proporcionado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await eliminarGasto(context, id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting gasto:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error al eliminar el gasto' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};