import { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '../../lib/format';
import { formatDate } from '../../lib/date';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import ConfirmDialog from '../ui/ConfirmDialog';
import { Select } from '../ui/Select';
import { StampLabel } from '../ui/StampLabel';
import GastoResumenModal from './GastoResumenModal';
import { Paperclip, Trash2 } from 'lucide-react';
import type { Database } from '../../types/database';

type Gasto = Database['public']['Tables']['gastos']['Row'];
type GastoPago = Database['public']['Tables']['gasto_pagos']['Row'] & {
  profiles?: { nombre: string } | null;
};
type Profile = Database['public']['Tables']['profiles']['Row'];

type GastoEnriquecido = Gasto & {
  eventos?: { nombre: string } | null;
  gasto_pagos?: GastoPago[];
};

interface Props {
  gastos: GastoEnriquecido[];
  editBasePath: string;
  emptyMessage?: string;
  profiles: Profile[];
  initialOpenGastoId?: string | null;
  initialVisibleGastosIds?: string[];
  onGastoDeleted?: (gasto: GastoEnriquecido) => void;
  onGastosDeleted?: (gastoIds: string[]) => void;
}

type SortKey = 'fecha' | 'pagado_por';
type SortDirection = 'asc' | 'desc';

function getFuentePrincipal(gasto: GastoEnriquecido) {
  const fuentes = (gasto.gasto_pagos ?? []).filter((f) => Number(f.cantidad) > 0);

  if (fuentes.length === 0) {
    return {
      nombre: gasto.tipo_gasto === 'directo_evento' ? 'Cobro del evento' : 'Sin asignar',
      socio_id: null as string | null,
      cantidad: 0,
    };
  }

  return fuentes.reduce((mejor, actual) =>
    Number(actual.cantidad) > Number(mejor.cantidad) ? actual : mejor,
  );
}

export default function GastosTable({
  gastos,
  editBasePath,
  emptyMessage = 'No hay gastos registrados. Crea tu primer gasto.',
  profiles,
  initialOpenGastoId = null,
  initialVisibleGastosIds = [],
  onGastoDeleted,
  onGastosDeleted,
}: Props) {
  const [rows, setRows] = useState(gastos);
  const [sortKey, setSortKey] = useState<SortKey>('fecha');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [singleDeleteOpen, setSingleDeleteOpen] = useState(false);
  const [deletingRow, setDeletingRow] = useState<GastoEnriquecido | null>(null);
  const [singleDeleteLoading, setSingleDeleteLoading] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkSocioId, setBulkSocioId] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [facturaError, setFacturaError] = useState<string | null>(null);
  const [resumenOpen, setResumenOpen] = useState(false);
  const [activeGastoId, setActiveGastoId] = useState<string | null>(null);

  useEffect(() => {
    setRows(gastos);
    setSelectedIds([]);
  }, [gastos]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sortKey === 'fecha') {
        const diff = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        if (diff !== 0) return sortDirection === 'asc' ? diff : -diff;
      } else {
        const aNombre = getFuentePrincipal(a).nombre.toLowerCase();
        const bNombre = getFuentePrincipal(b).nombre.toLowerCase();
        const diff = aNombre.localeCompare(bNombre);
        if (diff !== 0) return sortDirection === 'asc' ? diff : -diff;
      }

      return new Date(b.created_at ?? b.fecha).getTime() - new Date(a.created_at ?? a.fecha).getTime();
    });
  }, [rows, sortDirection, sortKey]);

  const selectedCount = selectedIds.length;
  const allVisibleSelected = sortedRows.length > 0 && sortedRows.every((row) => selectedIds.includes(row.id));
  const orderedIds = sortedRows.map((row) => row.id);

  useEffect(() => {
    if (!initialOpenGastoId) return;
    if (activeGastoId) return;

    const candidateIds = initialVisibleGastosIds.length > 0 ? initialVisibleGastosIds : orderedIds;
    const firstVisible = candidateIds.find((id) => orderedIds.includes(id));
    const targetId = orderedIds.includes(initialOpenGastoId) ? initialOpenGastoId : firstVisible ?? null;

    if (targetId) {
      setActiveGastoId(targetId);
      setResumenOpen(true);
    }
  }, [initialOpenGastoId, initialVisibleGastosIds, orderedIds, activeGastoId]);

  const openItem = (id: string) => {
    setActiveGastoId(id);
    setResumenOpen(true);
  };

  const closeResumen = () => {
    setResumenOpen(false);
    setActiveGastoId(null);

    const url = new URL(window.location.href);
    url.searchParams.delete('open_gasto');
    url.searchParams.delete('visible_gastos');
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  };

  const editFromResumen = (id: string, visibleIds: string[]) => {
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set('open_gasto', id);
    returnUrl.searchParams.set('visible_gastos', visibleIds.join(','));

    const editUrl = new URL(`${editBasePath}/${id}`, window.location.origin);
    editUrl.searchParams.set('return_to', `${returnUrl.pathname}${returnUrl.search}`);
    editUrl.searchParams.set('visible_gastos', visibleIds.join(','));

    window.location.href = `${editUrl.pathname}${editUrl.search}`;
  };

  const openDeleteDialog = (gasto: GastoEnriquecido) => {
    setDeletingRow(gasto);
    setDeleteError(null);
    setSingleDeleteOpen(true);
  };

  const deleteSingle = async () => {
    if (!deletingRow) return;

    setSingleDeleteLoading(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/gastos/${deletingRow.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo eliminar el gasto');
      }

      setRows((current) => current.filter((gasto) => gasto.id !== deletingRow.id));
      setSelectedIds((current) => current.filter((id) => id !== deletingRow.id));
      onGastoDeleted?.(deletingRow);
      setSingleDeleteOpen(false);
      setDeletingRow(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'No se pudo eliminar el gasto');
    } finally {
      setSingleDeleteLoading(false);
    }
  };

  const openBulkDeleteDialog = () => {
    setDeleteError(null);
    setBulkDeleteOpen(true);
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;

    setBulkDeleteLoading(true);
    setDeleteError(null);

    try {
      const response = await fetch('/api/gastos/eliminar-masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gasto_ids: selectedIds }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudieron eliminar los gastos seleccionados');
      }

      setRows((current) => current.filter((gasto) => !selectedIds.includes(gasto.id)));
      onGastosDeleted?.(selectedIds);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'No se pudieron eliminar los gastos seleccionados');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openItem(id);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const toggleRowSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selected) => selected !== id) : [...current, id],
    );
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !sortedRows.some((row) => row.id === id))
        : [...new Set([...current, ...sortedRows.map((row) => row.id)])],
    );
  };

  const fuenteTexto = (gasto: GastoEnriquecido) => {
    const fuentes = (gasto.gasto_pagos ?? []).filter((f) => Number(f.cantidad) > 0);

    if (fuentes.length === 0) {
      return gasto.tipo_gasto === 'directo_evento' ? 'Pagado del cobro del evento' : '—';
    }

    return fuentes
      .map((f) => {
        const nombre = f.socio_id === null ? 'Fondo' : f.profiles?.nombre ?? 'Socio';
        return `${nombre} ${formatCurrency(Number(f.cantidad))}`;
      })
      .join(' + ');
  };

  const applyBulkChange = async () => {
    setBulkLoading(true);
    setBulkError(null);

    try {
      const response = await fetch('/api/gastos/pagador-masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gasto_ids: selectedIds,
          socio_id: bulkSocioId || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo cambiar el pagador');
      }

      const selectedProfile = bulkSocioId ? profiles.find((profile) => profile.id === bulkSocioId) : null;
      setRows((current) =>
        current.map((gasto) => {
          if (!selectedIds.includes(gasto.id)) return gasto;

          return {
            ...gasto,
            gasto_pagos: [
              {
                id: crypto.randomUUID(),
                gasto_id: gasto.id,
                socio_id: bulkSocioId || null,
                cantidad: Number(gasto.cantidad),
                created_at: new Date().toISOString(),
                profiles: selectedProfile ? { nombre: selectedProfile.nombre } : null,
              },
            ],
          };
        }),
      );

      setSelectedIds([]);
      setBulkOpen(false);
      setBulkSocioId('');
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Error al cambiar el pagador');
    } finally {
      setBulkLoading(false);
    }
  };

  const openFactura = async (gasto: GastoEnriquecido) => {
    if (!gasto.factura_path) return;

    setFacturaError(null);

    try {
      const response = await fetch(`/api/gastos/${gasto.id}/factura-url`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo abrir la factura');
      }

      const payload = await response.json();
      if (!payload?.url) {
        throw new Error('No se pudo generar enlace temporal de factura');
      }

      window.open(payload.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setFacturaError(error instanceof Error ? error.message : 'No se pudo abrir la factura');
    }
  };

  if (sortedRows.length === 0) {
    return <div className="py-12 text-center text-text-secondary">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-3">
      {selectedCount > 0 && (
        <div className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 border border-border bg-surface p-3">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">
              {selectedCount} seleccionados
            </p>
            <p className="text-sm text-text-secondary">
              El cambio reemplazará las fuentes de pago de cada gasto seleccionado.
            </p>
          </div>
          <Button type="button" variant="primary" size="sm" onClick={() => setBulkOpen(true)}>
            Cambiar quién pagó
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={openBulkDeleteDialog}>
            Eliminar seleccionados
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="w-12 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                <Checkbox checked={allVisibleSelected} onChange={toggleAllVisible} />
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                Concepto
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                <button
                  type="button"
                  onClick={() => toggleSort('fecha')}
                  className="inline-flex items-center gap-1 hover:text-text-primary"
                >
                  Fecha <span>{sortIndicator('fecha')}</span>
                </button>
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                Categoría
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                Evento
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                <button
                  type="button"
                  onClick={() => toggleSort('pagado_por')}
                  className="inline-flex items-center gap-1 hover:text-text-primary"
                >
                  Pagado por <span>{sortIndicator('pagado_por')}</span>
                </button>
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                Cantidad
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((gasto) => {
              const fuentes = (gasto.gasto_pagos ?? []).filter((f) => Number(f.cantidad) > 0);
              const totalSocios = fuentes.filter((f) => f.socio_id !== null).reduce((sum, f) => sum + Number(f.cantidad), 0);

              return (
                <tr
                  key={gasto.id}
                  className="cursor-pointer border-b border-border transition-colors hover:bg-surface-hover"
                  onClick={() => openItem(gasto.id)}
                  onKeyDown={(event) => handleRowKeyDown(event, gasto.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir gasto ${gasto.concepto}`}
                  title="Abrir gasto"
                >
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(gasto.id)}
                      onChange={() => toggleRowSelection(gasto.id)}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">
                    <div className="flex items-center gap-2">
                      <span>{gasto.concepto}</span>
                      {gasto.factura_path && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openFactura(gasto);
                          }}
                          className="inline-flex items-center text-text-secondary hover:text-text-primary"
                          title="Abrir factura adjunta"
                          aria-label="Abrir factura adjunta"
                        >
                          <Paperclip size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {formatDate(gasto.fecha)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{gasto.categoria || 'Otros'}</td>
                  <td className="px-4 py-3 text-sm">
                    {gasto.tipo_gasto === 'inversion_empresa' ? (
                      <StampLabel rotate="none" variant="accent">
                        Inversión
                      </StampLabel>
                    ) : (
                      <StampLabel rotate="none" variant="outline">
                        Evento
                      </StampLabel>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {gasto.eventos?.nombre || <span className="italic">General</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-text-primary">{fuenteTexto(gasto)}</span>
                      {totalSocios > 0 &&
                        (gasto.reembolsado ? (
                          <StampLabel rotate="none" variant="accent">
                            Reembolsado
                          </StampLabel>
                        ) : (
                          <StampLabel rotate="none" variant="danger">
                            Pendiente
                          </StampLabel>
                        ))}
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 text-right text-sm text-danger"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    −{formatCurrency(gasto.cantidad)}
                  </td>
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => openItem(gasto.id)}>
                        Resumen
                      </Button>
                      <Button type="button" variant="danger" size="sm" onClick={() => openDeleteDialog(gasto)}>
                        <Trash2 size={14} />
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg border border-border-strong bg-surface p-5 space-y-4">
            <div className="space-y-2">
              <StampLabel rotate="left" variant="accent">
                Cambiar quién pagó
              </StampLabel>
              <p className="text-sm text-text-secondary">
                Vas a cambiar quién pagó en {selectedCount} gasto{selectedCount === 1 ? '' : 's'}. Esto sobrescribe todas las fuentes múltiples.
              </p>
            </div>

            <Select
              label="Nueva fuente de pago"
              value={bulkSocioId}
              onChange={(event) => setBulkSocioId(event.target.value)}
            >
              <option value="">Fondo de empresa</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.nombre}
                </option>
              ))}
            </Select>

            <p className="text-[11px] text-text-secondary leading-relaxed">
              Cada gasto seleccionado quedará con una única fila en gasto_pagos y con la cantidad completa del gasto.
            </p>

            {bulkError && <p className="text-sm text-danger">{bulkError}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setBulkOpen(false)} disabled={bulkLoading}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={applyBulkChange} isLoading={bulkLoading}>
                Aplicar cambios
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={singleDeleteOpen}
        title="Eliminar gasto"
        description={
          deletingRow
            ? `¿Eliminar el gasto '${deletingRow.concepto}' de ${formatCurrency(Number(deletingRow.cantidad))}? Esta acción no se puede deshacer.`
            : 'Esta acción no se puede deshacer.'
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        isLoading={singleDeleteLoading}
        onClose={() => {
          if (!singleDeleteLoading) {
            setSingleDeleteOpen(false);
            setDeletingRow(null);
          }
        }}
        onConfirm={deleteSingle}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Eliminar seleccionados"
        description={`¿Eliminar ${selectedCount} gasto${selectedCount === 1 ? '' : 's'} seleccionados? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        isLoading={bulkDeleteLoading}
        onClose={() => {
          if (!bulkDeleteLoading) setBulkDeleteOpen(false);
        }}
        onConfirm={deleteSelected}
      />

      {deleteError ? <div className="text-sm text-danger">{deleteError}</div> : null}
      {facturaError ? <div className="text-sm text-danger">{facturaError}</div> : null}

      <GastoResumenModal
        open={resumenOpen}
        gastos={rows}
        orderedIds={orderedIds}
        currentId={activeGastoId}
        onClose={closeResumen}
        onSelectId={setActiveGastoId}
        onEdit={editFromResumen}
      />
    </div>
  );
}
