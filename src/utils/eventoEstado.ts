export type EstadoFinanciero = 'no_pagado' | 'parcialmente_pagado' | 'pagado';
export type EstadoTrabajo = 'confirmado' | 'realizado' | 'cancelado';
export type EstadoVisible = EstadoTrabajo | 'completado';

export function getEstadoVisible(
  estadoTrabajo: EstadoTrabajo,
  estadoFinanciero: EstadoFinanciero,
): EstadoVisible {
  if (estadoTrabajo === 'realizado' && estadoFinanciero === 'pagado') {
    return 'completado';
  }
  return estadoTrabajo;
}

export function getEstadoVisibleLabel(estado: EstadoVisible): string {
  const labels: Record<EstadoVisible, string> = {
    confirmado: 'Confirmado',
    realizado: 'Realizado',
    completado: 'Completado',
    cancelado: 'Cancelado',
  };
  return labels[estado];
}

export function getEstadoFinancieroLabel(estado: EstadoFinanciero): string {
  const labels: Record<EstadoFinanciero, string> = {
    no_pagado: 'No pagado',
    parcialmente_pagado: 'Parcialmente pagado',
    pagado: 'Pagado',
  };
  return labels[estado];
}

export function getEstadoStamp(estado: EstadoVisible): {
  variant: 'outline' | 'accent' | 'danger';
  rotate: 'left' | 'right' | 'none';
} {
  const stamps: Record<EstadoVisible, { variant: 'outline' | 'accent' | 'danger'; rotate: 'left' | 'right' | 'none' }> = {
    confirmado: { variant: 'outline', rotate: 'left' },
    realizado: { variant: 'outline', rotate: 'right' },
    completado: { variant: 'accent', rotate: 'left' },
    cancelado: { variant: 'danger', rotate: 'left' },
  };
  return stamps[estado];
}
