import { useEffect, useMemo, useState } from 'react';
import { formatDate } from '../../lib/date';
import { formatCurrency } from '../../lib/format';
import { Button } from '../ui/Button';
import { StampLabel } from '../ui/StampLabel';
import type { Database } from '../../types/database';

type Gasto = Database['public']['Tables']['gastos']['Row'];
type GastoPago = Database['public']['Tables']['gasto_pagos']['Row'] & {
  profiles?: { nombre: string } | null;
};

type GastoDetalle = Gasto & {
  eventos?: { nombre: string } | null;
  gasto_pagos?: GastoPago[];
};

interface Props {
  open: boolean;
  gastos: GastoDetalle[];
  orderedIds: string[];
  currentId: string | null;
  onClose: () => void;
  onSelectId: (id: string) => void;
  onEdit: (id: string, orderedIds: string[]) => void;
  eventoFallbackNombre?: string;
}

function labelFormaPago(formaPago: Gasto['forma_pago']) {
  if (!formaPago) return 'Sin especificar';
  if (formaPago === 'efectivo') return 'Efectivo';
  return 'Banco';
}

function labelTipoFactura(tipoFactura: Gasto['tipo_factura']) {
  if (!tipoFactura) return 'Sin especificar';
  if (tipoFactura === 'A') return 'Con factura (A)';
  return 'Sin factura / ticket (B)';
}

export default function GastoResumenModal({
  open,
  gastos,
  orderedIds,
  currentId,
  onClose,
  onSelectId,
  onEdit,
  eventoFallbackNombre,
}: Props) {
  const [facturaError, setFacturaError] = useState<string | null>(null);
  const [facturaLoading, setFacturaLoading] = useState(false);

  const gastosById = useMemo(() => {
    const map = new Map<string, GastoDetalle>();
    for (const gasto of gastos) map.set(gasto.id, gasto);
    return map;
  }, [gastos]);

  const orderedVisibleIds = useMemo(
    () => orderedIds.filter((id) => gastosById.has(id)),
    [orderedIds, gastosById],
  );

  const idx = currentId ? orderedVisibleIds.indexOf(currentId) : -1;
  const current = currentId ? gastosById.get(currentId) ?? null : null;
  const prevId = idx > 0 ? orderedVisibleIds[idx - 1] : null;
  const nextId = idx >= 0 && idx < orderedVisibleIds.length - 1 ? orderedVisibleIds[idx + 1] : null;

  useEffect(() => {
    if (!open || idx !== -1 || orderedVisibleIds.length === 0) return;
    onSelectId(orderedVisibleIds[0]);
  }, [open, idx, orderedVisibleIds, onSelectId]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'ArrowLeft' && prevId) {
        onSelectId(prevId);
      }

      if (event.key === 'ArrowRight' && nextId) {
        onSelectId(nextId);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, prevId, nextId, onClose, onSelectId]);

  if (!open || !current) return null;

  const fuentes = (current.gasto_pagos ?? []).filter((f) => Number(f.cantidad) > 0);

  const verFactura = async () => {
    if (!current.factura_path) return;
    setFacturaError(null);
    setFacturaLoading(true);

    try {
      const response = await fetch(`/api/gastos/${current.id}/factura-url`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo generar el enlace de factura');
      }

      const payload = await response.json();
      if (!payload?.url) {
        throw new Error('No se recibió URL temporal de factura');
      }

      window.open(payload.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setFacturaError(error instanceof Error ? error.message : 'No se pudo abrir la factura');
    } finally {
      setFacturaLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/75 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl border border-border-strong bg-surface p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Resumen de gasto</p>
            <h3 className="mt-1 text-xl uppercase italic text-text-primary" style={{ fontFamily: 'Archivo Black, sans-serif' }}>
              {current.concepto}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => prevId && onSelectId(prevId)} disabled={!prevId}>
              ‹ Anterior
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => nextId && onSelectId(nextId)} disabled={!nextId}>
              Siguiente ›
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm text-text-secondary">Fecha: <span className="text-text-primary">{formatDate(current.fecha)}</span></p>
            <p className="text-sm text-text-secondary">Cantidad: <span className="text-danger" style={{ fontFamily: '"JetBrains Mono", monospace' }}>−{formatCurrency(Number(current.cantidad))}</span></p>
            <p className="text-sm text-text-secondary">Categoría: <span className="text-text-primary">{current.categoria}</span></p>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span>Tipo:</span>
              {current.tipo_gasto === 'inversion_empresa' ? (
                <StampLabel rotate="none" variant="accent">Inversión</StampLabel>
              ) : (
                <StampLabel rotate="none" variant="outline">Evento</StampLabel>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span>Estado:</span>
              {current.pagado ? (
                <StampLabel rotate="none" variant="accent">Pagado</StampLabel>
              ) : (
                <StampLabel rotate="none" variant="outline">Previsto</StampLabel>
              )}
            </div>
            <p className="text-sm text-text-secondary">Forma de pago: <span className="text-text-primary">{labelFormaPago(current.forma_pago)}</span></p>
            <p className="text-sm text-text-secondary">¿Tiene factura?: <span className="text-text-primary">{labelTipoFactura(current.tipo_factura)}</span></p>
            <p className="text-sm text-text-secondary">
              Reembolso:{' '}
              {!current.pagado ? (
                <span className="text-text-secondary">No aplica (previsto)</span>
              ) : current.reembolsado ? (
                <span className="text-accent">Reembolsado</span>
              ) : (
                <span className="text-danger">Pendiente</span>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-text-secondary">
              Evento asociado:{' '}
              {current.evento_id ? (
                <a href={`/eventos/${current.evento_id}/detalle`} className="text-accent hover:underline">
                  {current.eventos?.nombre || eventoFallbackNombre || 'Ver evento'}
                </a>
              ) : (
                <span className="text-text-primary">Sin evento</span>
              )}
            </p>

            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Desglose de pago</p>
              {!current.pagado ? (
                <p className="mt-1 text-sm text-text-primary">Gasto previsto: aún no tiene desembolso registrado.</p>
              ) : fuentes.length === 0 ? (
                <p className="mt-1 text-sm text-text-primary">{current.tipo_gasto === 'directo_evento' ? 'Pagado del cobro del evento' : 'Sin fuentes registradas'}</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {fuentes.map((fuente) => {
                    const nombre = fuente.socio_id ? fuente.profiles?.nombre ?? 'Socio' : 'Fondo';
                    return (
                      <li key={fuente.id} className="text-sm text-text-primary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {nombre}: {formatCurrency(Number(fuente.cantidad))}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {current.factura_path ? (
              <div className="pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => void verFactura()} isLoading={facturaLoading}>
                  Ver factura
                </Button>
                {facturaError ? <p className="mt-2 text-xs text-danger">{facturaError}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Sin factura adjunta</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button type="button" variant="primary" onClick={() => onEdit(current.id, orderedVisibleIds)}>Editar</Button>
        </div>
      </div>
    </div>
  );
}
