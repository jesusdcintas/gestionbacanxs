import type { APIRoute } from 'astro';
import { getSupabaseServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();

    const socioAcreedorId = typeof body?.socio_acreedor_id === 'string' ? body.socio_acreedor_id : null;
    const cantidad = Number(body?.cantidad);
    const pagarDesdeFondo = Boolean(body?.pagar_desde_fondo);
    const fecha = typeof body?.fecha === 'string' && body.fecha ? body.fecha : null;
    const concepto = typeof body?.concepto === 'string' ? body.concepto : null;

    if (!socioAcreedorId) {
      return new Response(JSON.stringify({ error: 'socio_acreedor_id requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return new Response(JSON.stringify({ error: 'cantidad inválida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabaseServerClient(context);
    const { data, error } = await supabase.rpc('liquidar_diferencia_socios', {
      p_socio_acreedor_id: socioAcreedorId,
      p_cantidad: cantidad,
      p_pagar_desde_fondo: pagarDesdeFondo,
      p_fecha: fecha,
      p_concepto: concepto,
    });

    if (error) {
      console.error('Error liquidando diferencia:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, resumen: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en POST /api/balance/liquidar-diferencia:', error);
    const message = error instanceof Error ? error.message : 'Error al liquidar diferencia';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};