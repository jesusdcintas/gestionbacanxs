import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { StampLabel } from '../ui/StampLabel';
import ConfirmDialog from '../ui/ConfirmDialog';
import RepartoSection from './RepartoSection';
import GastoResumenModal from '../gastos/GastoResumenModal';
import { IVA_POR_DEFECTO } from '../../utils/finanzas';
import { formatCurrency } from '../../lib/format';
import { formatDate } from '../../lib/date';
import type { Database } from '../../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type GastoPago = Database['public']['Tables']['gasto_pagos']['Row'] & {
  profiles?: { nombre: string } | null;
};
type GastoEvento = Database['public']['Tables']['gastos']['Row'] & {
  gasto_pagos?: GastoPago[];
};
type RepartoHistorico = {
  id: string;
  socio_id: string | null;
  nombre: string;
  cantidad: number;
  fecha: string;
  concepto: string | null;
  created_at?: string | null;
};

interface Props {
  eventoId: string;
  eventoNombre?: string;
  presupuesto: number;
  ingresoNeto: number;
  ivaImporte: number;
  baseImponible: number;
  retencionImporte: number;
  totalPagado: number;
  totalGastosInicial: number;
  conFactura: boolean;
  retencionIrpf: number;
  gastosIniciales: GastoEvento[];
  socios: Profile[];
  repartosIniciales: RepartoHistorico[];
  initialOpenGastoId?: string | null;
  initialVisibleGastosIds?: string[];
}

export default function FinanzasEventoPanel({
  eventoId,
  eventoNombre,
  presupuesto,
  ingresoNeto,
  ivaImporte,
  baseImponible,
  retencionImporte,
  totalPagado,
  totalGastosInicial,
  conFactura,
  retencionIrpf,
  gastosIniciales,
  socios,
  repartosIniciales,
  initialOpenGastoId = null,
  initialVisibleGastosIds = [],
}: Props) {
  const [gastos, setGastos] = useState(gastosIniciales);
  const [deleteRow, setDeleteRow] = useState<GastoEvento | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ type: 'none' } | { type: 'resumen'; gastoId: string }>({ type: 'none' });
  const initialOpenConsumed = useRef(false);

  const totalGastosPagados = useMemo(
    () => gastos.filter((gasto) => gasto.pagado).reduce((sum, gasto) => sum + Number(gasto.cantidad), 0),
    [gastos],
  );
  const totalGastosPrevistos = useMemo(
    () => gastos.filter((gasto) => !gasto.pagado).reduce((sum, gasto) => sum + Number(gasto.cantidad), 0),
    [gastos],
  );
  const netoRepartible = useMemo(() => ingresoNeto - totalGastosPagados, [ingresoNeto, totalGastosPagados]);
  const orderedIds = useMemo(() => gastos.map((gasto) => gasto.id), [gastos]);

  useEffect(() => {
    if (initialOpenConsumed.current) return;
    if (!initialOpenGastoId) return;
    const candidateIds = initialVisibleGastosIds.length > 0 ? initialVisibleGastosIds : orderedIds;
    const firstVisible = candidateIds.find((id) => orderedIds.includes(id));
    const targetId = orderedIds.includes(initialOpenGastoId) ? initialOpenGastoId : firstVisible ?? null;
    if (targetId) {
      setModalState({ type: 'resumen', gastoId: targetId });
    }

    initialOpenConsumed.current = true;
  }, [initialOpenGastoId, initialVisibleGastosIds, orderedIds]);

  const closeResumen = () => {
    setModalState({ type: 'none' });
    initialOpenConsumed.current = true;

    const url = new URL(window.location.href);
    url.searchParams.delete('open_gasto');
    url.searchParams.delete('visible_gastos');
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  };

  const editFromResumen = (id: string, visibleIds: string[]) => {
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set('open_gasto', id);
    returnUrl.searchParams.set('visible_gastos', visibleIds.join(','));

    const editUrl = new URL(`/gastos/${id}`, window.location.origin);
    editUrl.searchParams.set('return_to', `${returnUrl.pathname}${returnUrl.search}`);
    editUrl.searchParams.set('visible_gastos', visibleIds.join(','));
    window.location.href = `${editUrl.pathname}${editUrl.search}`;
  };

  const fuentesTexto = (gasto: GastoEvento) => {
    const fuentes = (gasto.gasto_pagos ?? []).filter((f) => Number(f.cantidad) > 0);

    if (fuentes.length === 0) return gasto.tipo_gasto === 'directo_evento' ? 'Pagado del cobro del evento' : '—';

    return fuentes
      .map((f) => {
        const nombre = f.socio_id ? f.profiles?.nombre ?? 'Socio' : 'Fondo';
        return `${nombre} ${Number(f.cantidad).toFixed(2)}€`;
      })
      .join(' + ');
  };

  const handleDelete = async () => {
    if (!deleteRow) return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/gastos/${deleteRow.id}`, { method: 'DELETE' });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo eliminar el gasto');
      }

      setGastos((current) => current.filter((gasto) => gasto.id !== deleteRow.id));
      setDeleteRow(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'No se pudo eliminar el gasto');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <StampLabel rotate="left">Resumen financiero</StampLabel>
            <p className="text-sm text-text-secondary mt-2">El neto repartible se recalcula al eliminar gastos del evento.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="p-4 bg-[#0a0a0a] border border-border">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary mb-1">Presupuesto</p>
            <p className="text-2xl font-bold text-text-primary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{presupuesto.toFixed(2)} €</p>
          </div>
          <div className="p-4 bg-[#0a0a0a] border border-border">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary mb-1">Ingreso neto</p>
            <p className="text-2xl font-bold text-accent" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{ingresoNeto.toFixed(2)} €</p>
            {conFactura && (
              <div className="mt-1 space-y-1">
                <p className="text-xs text-text-secondary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  IVA ({IVA_POR_DEFECTO}%): −{ivaImporte.toFixed(2)} €
                </p>
                <p className="text-xs text-text-secondary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  Base imponible: {baseImponible.toFixed(2)} €
                </p>
                <p className="text-xs text-text-secondary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  Retención IRPF ({retencionIrpf.toFixed(2)}%): −{retencionImporte.toFixed(2)} €
                </p>
              </div>
            )}
          </div>
          <div className="p-4 bg-[#0a0a0a] border border-border">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary mb-1">Total pagado</p>
            <p className="text-2xl font-bold text-text-primary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{totalPagado.toFixed(2)} €</p>
            <p className="text-xs text-text-secondary mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              Pendiente: {(presupuesto - totalPagado).toFixed(2)} €
            </p>
          </div>
          <div className="p-4 bg-[#0a0a0a] border border-border">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary mb-1">Gastos pagados</p>
            <p className="text-2xl font-bold text-danger" style={{ fontFamily: '"JetBrains Mono", monospace' }}>−{totalGastosPagados.toFixed(2)} €</p>
            {totalGastosInicial !== totalGastosPagados ? (
              <p className="text-xs text-text-secondary mt-1">Sincronizado desde lista local de gastos</p>
            ) : null}
          </div>
          <div className="p-4 bg-[#0a0a0a] border border-border">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary mb-1">Neto repartible</p>
            <p className={`text-2xl font-bold ${netoRepartible >= 0 ? 'text-accent' : 'text-danger'}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {netoRepartible.toFixed(2)} €
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <StampLabel rotate="left">Gastos del evento</StampLabel>
            <p className="mt-2 text-sm text-text-secondary">
              Total pagado: <span className="font-semibold text-danger" style={{ fontFamily: '"JetBrains Mono", monospace' }}>−{formatCurrency(totalGastosPagados)} €</span>
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Total previsto (no incluido en neto): <span className="font-semibold text-text-primary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>−{formatCurrency(totalGastosPrevistos)} €</span>
            </p>
          </div>
          <a
            href={`/gastos/nuevo?evento=${eventoId}`}
            className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-[#0a0a0a] text-sm font-bold transition-colors"
          >
            + Añadir gasto
          </a>
        </div>

        {gastos.length === 0 ? (
          <p className="py-8 text-sm text-center text-text-secondary">No hay gastos asociados a este evento</p>
        ) : (
          <div className="space-y-2">
            {gastos.map((gasto) => (
              <div
                key={gasto.id}
                className={`flex cursor-pointer items-center justify-between gap-4 border bg-[#0a0a0a] p-3 transition-colors hover:border-border-strong ${
                  gasto.pagado ? 'border-border' : 'border-border-strong border-dashed opacity-85'
                }`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setModalState({ type: 'resumen', gastoId: gasto.id });
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setModalState({ type: 'resumen', gastoId: gasto.id });
                  }
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-text-primary">{gasto.concepto}</p>
                    {gasto.pagado ? (
                      <StampLabel rotate="none" variant="accent">Pagado</StampLabel>
                    ) : (
                      <StampLabel rotate="none" variant="outline">Previsto</StampLabel>
                    )}
                    {gasto.reembolsado ? <StampLabel rotate="none" variant="accent">Reembolsado</StampLabel> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <span className="text-xs text-text-secondary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      {formatDate(gasto.fecha)}
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">{gasto.categoria}</span>
                    <span className="text-[11px] uppercase tracking-[0.08em] text-text-primary">
                      {gasto.pagado ? `Pagado con: ${fuentesTexto(gasto)}` : 'No desembolsado todavía'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-semibold text-danger" style={{ fontFamily: '"JetBrains Mono", monospace' }}>−{Number(gasto.cantidad).toFixed(2)} €</span>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteError(null);
                      setDeleteRow(gasto);
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {deleteError ? <div className="mt-4 border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">{deleteError}</div> : null}
      </Card>

      <RepartoSection eventoId={eventoId} socios={socios} repartosIniciales={repartosIniciales} netoRepartible={netoRepartible} />

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Eliminar gasto"
        description={deleteRow ? `¿Eliminar el gasto '${deleteRow.concepto}' de ${formatCurrency(Number(deleteRow.cantidad))}? Esta acción no se puede deshacer.` : undefined}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        isLoading={deleteLoading}
        onClose={() => {
          if (!deleteLoading) setDeleteRow(null);
        }}
        onConfirm={handleDelete}
      />

      <GastoResumenModal
        open={modalState.type === 'resumen'}
        gastos={gastos}
        orderedIds={orderedIds}
        currentId={modalState.type === 'resumen' ? modalState.gastoId : null}
        onClose={closeResumen}
        onSelectId={(id) => setModalState({ type: 'resumen', gastoId: id })}
        onEdit={editFromResumen}
        eventoFallbackNombre={eventoNombre}
      />
    </div>
  );
}