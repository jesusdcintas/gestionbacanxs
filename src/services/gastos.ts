import type { APIContext } from 'astro';
import { getSupabaseServerClient } from '../lib/supabase';
import type { Database } from '../types/database';

type Gasto = Database['public']['Tables']['gastos']['Row'];
type GastoInsert = Database['public']['Tables']['gastos']['Insert'];
type GastoUpdate = Database['public']['Tables']['gastos']['Update'];
type GastoPago = Database['public']['Tables']['gasto_pagos']['Row'];
export type TipoGasto = 'directo_evento' | 'inversion_empresa';
export type FormaPagoGasto = 'tarjeta' | 'transferencia' | 'efectivo';
export type TipoFacturaGasto = 'A' | 'B';

export interface FuentePagoInput {
  socio_id: string | null;
  cantidad: number;
}

const ALLOWED_FACTURA_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);

function getSupabaseErrorInfo(error: unknown) {
  const raw = error as {
    name?: string;
    message?: string;
    statusCode?: string | number;
    code?: string;
    error?: string;
    details?: string;
    hint?: string;
  };

  return {
    name: raw?.name ?? 'SupabaseError',
    message: raw?.message ?? 'Error desconocido',
    statusCode: raw?.statusCode ?? null,
    code: raw?.code ?? null,
    error: raw?.error ?? null,
    details: raw?.details ?? null,
    hint: raw?.hint ?? null,
  };
}

function buildSupabaseErrorMessage(prefix: string, error: unknown) {
  const info = getSupabaseErrorInfo(error);
  const chunks = [info.message];

  if (info.error && info.error !== info.message) {
    chunks.push(info.error);
  }

  if (info.code) {
    chunks.push(`code=${info.code}`);
  }

  if (info.statusCode) {
    chunks.push(`status=${info.statusCode}`);
  }

  return `${prefix}: ${chunks.join(' | ')}`;
}

function getFacturaExtension(file: File) {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';

  const name = file.name || '';
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : '';
  if (ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
    return ext === 'jpeg' ? 'jpg' : ext;
  }

  throw new Error('Formato de factura no soportado. Usa PDF, JPG o PNG.');
}

export type GastoConFuentes = Gasto & {
  eventos?: { nombre: string } | null;
  gasto_pagos?: (GastoPago & { profiles?: { nombre: string } | null })[];
};

export const CATEGORIAS_GASTO = [
  'Transporte',
  'Alojamiento',
  'Comida',
  'Equipamiento',
  'Promoción',
  'Servicios',
  'Consumible',
  'Otros',
] as const;

const GASTO_SELECT = `
  *,
  eventos(nombre),
  gasto_pagos(*, profiles(nombre))
`;

export async function getGastos(context: APIContext) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('gastos')
    .select(GASTO_SELECT)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos:', error);
    throw new Error('No se pudieron cargar los gastos');
  }

  return data as GastoConFuentes[];
}

export async function getGasto(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('gastos')
    .select(GASTO_SELECT)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching gasto:', error);
    throw new Error('No se pudo cargar el gasto');
  }

  return data as GastoConFuentes;
}

/**
 * Guarda gasto + fuentes de pago de forma atómica.
 * Si gastoId es null, crea gasto nuevo. Si existe, actualiza gasto existente.
 */
export async function guardarGastoConPagos(
  context: APIContext,
  gastoData: GastoInsert | GastoUpdate,
  fuentesPago: FuentePagoInput[],
  gastoId: string | null = null,
) {
  const supabase = getSupabaseServerClient(context);

  const fuentes = fuentesPago
    .map((f) => ({
      socio_id: f.socio_id,
      cantidad: Number(f.cantidad),
    }))
    .filter((f) => f.cantidad > 0);

  const totalFuentes = fuentes.reduce((sum, f) => sum + f.cantidad, 0);
  const cantidadGasto = Number(gastoData.cantidad ?? 0);
  const tipoGasto = (gastoData.tipo_gasto ?? 'directo_evento') as TipoGasto;
  const eventoId = gastoData.evento_id ?? null;
  const requiereFuentesExactas = tipoGasto === 'inversion_empresa';
  const gastoPagado = Boolean(gastoData.pagado ?? true);
  const formaPago = (gastoData.forma_pago ?? null) as FormaPagoGasto | null;
  const tipoFactura = (gastoData.tipo_factura ?? null) as TipoFacturaGasto | null;
  const facturaPath = gastoData.factura_path ?? null;

  if (tipoGasto === 'directo_evento' && !eventoId) {
    throw new Error('Los gastos directos de evento deben estar vinculados a un evento.');
  }

  if (gastoPagado && requiereFuentesExactas && fuentes.length === 0) {
    throw new Error('Debes indicar al menos una fuente de pago con cantidad mayor a 0');
  }

  if (gastoPagado && requiereFuentesExactas && Math.abs(totalFuentes - cantidadGasto) > 0.01) {
    throw new Error(
      `Las fuentes de pago (${totalFuentes.toFixed(2)}€) no coinciden con la cantidad del gasto (${cantidadGasto.toFixed(2)}€).`,
    );
  }

  const { data, error } = await supabase.rpc('guardar_gasto_con_pagos', {
    p_gasto_id: gastoId,
    p_concepto: String(gastoData.concepto || ''),
    p_cantidad: cantidadGasto,
    p_categoria: String(gastoData.categoria || 'Otros'),
    p_tipo_gasto: tipoGasto,
    p_fecha: String(gastoData.fecha || new Date().toISOString().slice(0, 10)),
    p_evento_id: eventoId,
    p_reembolsado: Boolean(gastoData.reembolsado ?? false),
    p_pagado: gastoPagado,
    p_forma_pago: formaPago,
    p_tipo_factura: tipoFactura,
    p_factura_path: facturaPath,
    p_fuentes: fuentes as any,
  });

  if (error) {
    console.error('Error guardando gasto con pagos:', error);
    throw new Error(`No se pudo guardar el gasto: ${error.message}`);
  }

  const gastoGuardadoId = String(data);
  return getGasto(context, gastoGuardadoId);
}

// Wrappers de compatibilidad
export async function createGasto(
  context: APIContext,
  gasto: GastoInsert,
  fuentesPago: FuentePagoInput[],
) {
  return guardarGastoConPagos(context, gasto, fuentesPago, null);
}

export async function updateGasto(
  context: APIContext,
  id: string,
  gasto: GastoUpdate,
  fuentesPago: FuentePagoInput[],
) {
  return guardarGastoConPagos(context, gasto, fuentesPago, id);
}

export async function subirFacturaGasto(
  context: APIContext,
  gastoId: string,
  file: File,
  previousPath: string | null = null,
) {
  if (file.size <= 0) {
    throw new Error('El archivo de factura está vacío.');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('La factura supera el límite de 10MB.');
  }

  if (file.type && !ALLOWED_FACTURA_MIME.has(file.type)) {
    throw new Error('Tipo de archivo no permitido. Solo PDF, JPG o PNG.');
  }

  const extension = getFacturaExtension(file);
  const facturaPath = `${gastoId}/factura.${extension}`;
  const supabase = getSupabaseServerClient(context);

  if (previousPath) {
    const { error: removeError } = await supabase.storage.from('facturas').remove([previousPath]);
    if (removeError) {
      console.error('Error borrando factura anterior:', {
        gastoId,
        previousPath,
        removeError: getSupabaseErrorInfo(removeError),
      });
    }
  }

  const { error: uploadError } = await supabase.storage.from('facturas').upload(facturaPath, file, {
    contentType: file.type || (extension === 'pdf' ? 'application/pdf' : extension === 'png' ? 'image/png' : 'image/jpeg'),
    upsert: true,
  });

  if (uploadError) {
    console.error('Error subiendo factura a Storage:', {
      gastoId,
      facturaPath,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadError: getSupabaseErrorInfo(uploadError),
    });
    throw new Error(buildSupabaseErrorMessage('No se pudo subir la factura al almacenamiento', uploadError));
  }

  const { error: updateError } = await supabase
    .from('gastos')
    .update({ factura_path: facturaPath })
    .eq('id', gastoId);

  if (updateError) {
    console.error('Error guardando factura_path en gasto:', {
      gastoId,
      facturaPath,
      updateError: getSupabaseErrorInfo(updateError),
    });
    throw new Error(buildSupabaseErrorMessage('No se pudo guardar la ruta de la factura en el gasto', updateError));
  }

  return facturaPath;
}

export async function getFacturaSignedUrl(context: APIContext, gastoId: string) {
  const supabase = getSupabaseServerClient(context);

  const { data: gasto, error: gastoError } = await supabase
    .from('gastos')
    .select('factura_path')
    .eq('id', gastoId)
    .single();

  if (gastoError) {
    console.error('Error cargando factura_path del gasto:', gastoError);
    throw new Error('No se pudo cargar la factura del gasto.');
  }

  if (!gasto.factura_path) {
    throw new Error('Este gasto no tiene factura adjunta.');
  }

  const { data, error } = await supabase.storage
    .from('facturas')
    .createSignedUrl(gasto.factura_path, 60);

  if (error || !data?.signedUrl) {
    console.error('Error creando signed URL de factura:', {
      gastoId,
      facturaPath: gasto.factura_path,
      signedUrlError: getSupabaseErrorInfo(error),
    });
    throw new Error(buildSupabaseErrorMessage('No se pudo generar el enlace temporal de la factura', error));
  }

  return data.signedUrl;
}

export async function deleteGasto(context: APIContext, id: string) {
  const supabase = getSupabaseServerClient(context);

  const { data: gasto } = await supabase
    .from('gastos')
    .select('factura_path')
    .eq('id', id)
    .single();

  if (gasto?.factura_path) {
    const { error: removeError } = await supabase.storage.from('facturas').remove([gasto.factura_path]);
    if (removeError) {
      console.error('Error borrando factura del bucket:', removeError);
    }
  }

  const { error } = await supabase.from('gastos').delete().eq('id', id);

  if (error) {
    console.error('Error deleting gasto:', error);
    throw new Error('No se pudo eliminar el gasto');
  }
}

export async function eliminarGasto(context: APIContext, id: string) {
  return deleteGasto(context, id);
}

export async function eliminarGastosMasivo(context: APIContext, ids: string[]) {
  const supabase = getSupabaseServerClient(context);

  const { error } = await supabase.from('gastos').delete().in('id', ids);

  if (error) {
    console.error('Error deleting gastos masivo:', error);
    throw new Error('No se pudieron eliminar los gastos seleccionados');
  }
}

export async function getGastosByEvento(context: APIContext, eventoId: string) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('gastos')
    .select('*, gasto_pagos(*, profiles(nombre))')
    .eq('evento_id', eventoId)
    .eq('tipo_gasto', 'directo_evento')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos by evento:', error);
    throw new Error('No se pudieron cargar los gastos del evento');
  }

  return data as (Gasto & {
    gasto_pagos?: (GastoPago & { profiles?: { nombre: string } | null })[];
  })[];
}

export async function getGastosGenerales(context: APIContext) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('gastos')
    .select('*, gasto_pagos(*, profiles(nombre))')
    .is('evento_id', null)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos generales:', error);
    throw new Error('No se pudieron cargar los gastos generales');
  }

  return data as (Gasto & {
    gasto_pagos?: (GastoPago & { profiles?: { nombre: string } | null })[];
  })[];
}

export async function getGastosPendientesReembolso(context: APIContext) {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('gastos')
    .select('*, eventos(nombre), gasto_pagos(*, profiles(nombre))')
    .eq('reembolsado', false)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error fetching gastos pendientes reembolso:', error);
    throw new Error('No se pudieron cargar los gastos pendientes de reembolso');
  }

  // Solo pendientes con aportación de socios (socio_id != null)
  return (data as any[]).filter((g) =>
    (g.gasto_pagos ?? []).some((gp: any) => gp.socio_id !== null),
  ) as GastoConFuentes[];
}

export async function getTotalGastosEvento(context: APIContext, eventoId: string): Promise<number> {
  const supabase = getSupabaseServerClient(context);

  const { data, error } = await supabase
    .from('gastos')
    .select('cantidad')
    .eq('evento_id', eventoId)
    .eq('tipo_gasto', 'directo_evento')
    .eq('pagado', true);

  if (error) {
    console.error('Error fetching total gastos evento:', error);
    throw new Error('No se pudo calcular el total de gastos del evento');
  }

  return (data ?? []).reduce((total, gasto) => total + Number(gasto.cantidad), 0);
}

export async function cambiarPagadorMasivo(
  context: APIContext,
  gastoIds: string[],
  socioId: string | null,
) {
  const supabase = getSupabaseServerClient(context);

  const { error } = await supabase.rpc('cambiar_pagador_masivo', {
    p_gasto_ids: gastoIds,
    p_socio_id: socioId,
  });

  if (error) {
    console.error('Error cambiando pagador masivo:', error);
    throw new Error(`No se pudo cambiar el pagador: ${error.message}`);
  }
}
