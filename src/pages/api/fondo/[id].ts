import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../lib/supabase';

export const DELETE: APIRoute = async (context) => {
  try {
    const { id } = context.params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    }

    const supabase = getSupabaseServerClient(context);

    // Solo permitir eliminar movimientos manuales (sin evento_id ni gasto_id)
    const { data: mov, error: fetchError } = await supabase
      .from('fondo_movimientos')
      .select('evento_id, gasto_id')
      .eq('id', id)
      .single();

    if (fetchError || !mov) {
      return new Response(JSON.stringify({ error: 'Movimiento no encontrado' }), { status: 404 });
    }

    if (mov.evento_id || mov.gasto_id) {
      return new Response(
        JSON.stringify({ error: 'No se puede eliminar un movimiento vinculado a un evento o gasto' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await supabase.from('fondo_movimientos').delete().eq('id', id);

    if (error) {
      throw error;
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting movimiento fondo:', error);
    const message = error instanceof Error ? error.message : 'Error al eliminar el movimiento';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
