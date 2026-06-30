import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();

    if (!body.gasto_id || typeof body.gasto_id !== 'string') {
      return new Response(JSON.stringify({ error: 'gasto_id requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!body.fecha || typeof body.fecha !== 'string') {
      return new Response(JSON.stringify({ error: 'fecha requerida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabaseServerClient(context);
    const { error } = await supabase.rpc('reembolsar_gasto', {
      p_gasto_id: body.gasto_id,
      p_fecha: body.fecha,
    });

    if (error) {
      console.error('Error reembolsando gasto:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en POST /api/reembolsos:', error);
    const message = error instanceof Error ? error.message : 'Error al reembolsar el gasto';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
