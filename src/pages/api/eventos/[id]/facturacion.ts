import type { APIRoute } from 'astro';
import { updateEvento } from '../../../../services/eventos';

function parseRetencion(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const parsed = Number(String(value));
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

export const POST: APIRoute = async (context) => {
  try {
    const { id } = context.params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID no proporcionado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await context.request.formData();
    const redirectTo = String(formData.get('redirect_to') || `/eventos/${id}/detalle`);

    const conFactura = formData.get('con_factura') === 'true';
    const retencion = parseRetencion(formData.get('retencion_irpf'));

    if (retencion === null || retencion < 0 || retencion > 100) {
      return new Response(JSON.stringify({ error: 'La retención IRPF debe estar entre 0 y 100' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await updateEvento(context, id, {
      con_factura: conFactura,
      retencion_irpf: retencion,
    });

    return context.redirect(redirectTo, 303);
  } catch (error) {
    console.error('Error actualizando facturación del evento:', error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'Error actualizando facturación del evento',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};
