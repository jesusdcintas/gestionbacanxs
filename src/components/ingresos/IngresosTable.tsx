import { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '../../lib/format';
import { formatDate } from '../../lib/date';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Select } from '../ui/Select';
import { StampLabel } from '../ui/StampLabel';
import type { Database } from '../../types/database';

type Ingreso = Database['public']['Tables']['pagos_evento']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

type IngresoEnriquecido = Ingreso & {
  eventos?: { nombre: string } | null;
  recibido_por_profile?: { nombre: string } | null;
};

interface Props {
  ingresos: IngresoEnriquecido[];
  editBasePath: string;
  profiles: Profile[];
}

type SortKey = 'fecha' | 'recibido_por';
type SortDirection = 'asc' | 'desc';

function getRecibidoNombre(ingreso: IngresoEnriquecido) {
  return ingreso.recibido_por_profile?.nombre ?? 'Sin asignar';
}

export default function IngresosTable({ ingresos, editBasePath, profiles }: Props) {
  const [rows, setRows] = useState(ingresos);
  const [sortKey, setSortKey] = useState<SortKey>('fecha');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRecipientId, setBulkRecipientId] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  useEffect(() => {
    setRows(ingresos);
    setSelectedIds([]);
  }, [ingresos]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sortKey === 'fecha') {
        const diff = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        if (diff !== 0) return sortDirection === 'asc' ? diff : -diff;
      } else {
        const diff = getRecibidoNombre(a).toLowerCase().localeCompare(getRecibidoNombre(b).toLowerCase());
        if (diff !== 0) return sortDirection === 'asc' ? diff : -diff;
      }

      return new Date(b.created_at ?? b.fecha).getTime() - new Date(a.created_at ?? a.fecha).getTime();
    });
  }, [rows, sortDirection, sortKey]);

  const selectedCount = selectedIds.length;
  const allVisibleSelected = sortedRows.length > 0 && sortedRows.every((row) => selectedIds.includes(row.id));

  const openItem = (id: string) => {
    window.location.href = `${editBasePath}/${id}`;
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

  const applyBulkChange = async () => {
    setBulkLoading(true);
    setBulkError(null);

    try {
      const response = await fetch('/api/ingresos/receptor-masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pago_ids: selectedIds,
          socio_id: bulkRecipientId,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo cambiar el receptor');
      }

      const selectedProfile = profiles.find((profile) => profile.id === bulkRecipientId);
      setRows((current) =>
        current.map((ingreso) => {
          if (!selectedIds.includes(ingreso.id)) return ingreso;

          return {
            ...ingreso,
            recibido_por: bulkRecipientId,
            recibido_por_profile: selectedProfile ? { nombre: selectedProfile.nombre } : null,
          };
        }),
      );

      setSelectedIds([]);
      setBulkOpen(false);
      setBulkRecipientId('');
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Error al cambiar el receptor');
    } finally {
      setBulkLoading(false);
    }
  };

  if (sortedRows.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        No hay ingresos registrados. Crea tu primer ingreso.
      </div>
    );
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
              Vas a cambiar quién cobró en los ingresos seleccionados.
            </p>
          </div>
          <Button type="button" variant="primary" size="sm" onClick={() => setBulkOpen(true)}>
            Cambiar quién cobró
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
                <button
                  type="button"
                  onClick={() => toggleSort('recibido_por')}
                  className="inline-flex items-center gap-1 hover:text-text-primary"
                >
                  Recibido por <span>{sortIndicator('recibido_por')}</span>
                </button>
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                Método
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                Evento
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                Cantidad
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((ingreso) => (
              <tr
                key={ingreso.id}
                className="cursor-pointer border-b border-border transition-colors hover:bg-surface-hover"
                onClick={() => openItem(ingreso.id)}
                onKeyDown={(event) => handleRowKeyDown(event, ingreso.id)}
                tabIndex={0}
                role="button"
                aria-label={`Abrir ingreso ${ingreso.concepto || 'sin concepto'}`}
                title="Abrir ingreso"
              >
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(ingreso.id)}
                    onChange={() => toggleRowSelection(ingreso.id)}
                  />
                </td>
                <td className="px-4 py-3 text-sm font-medium text-text-primary">
                  {ingreso.concepto || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {formatDate(ingreso.fecha)}
                </td>
                <td className="px-4 py-3 text-sm">
                  {ingreso.recibido_por_profile?.nombre ? (
                    <StampLabel rotate="none" variant="outline">
                      {ingreso.recibido_por_profile.nombre}
                    </StampLabel>
                  ) : (
                    <StampLabel rotate="none" variant="danger">
                      Sin asignar
                    </StampLabel>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <StampLabel rotate="none" variant={ingreso.metodo_pago === 'banco' ? 'accent' : 'outline'}>
                    {ingreso.metodo_pago === 'banco' ? 'Banco' : 'Efectivo'}
                  </StampLabel>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {ingreso.eventos?.nombre || '—'}
                </td>
                <td className="px-4 py-3 text-right text-sm text-accent" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {formatCurrency(ingreso.cantidad)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg border border-border-strong bg-surface p-5 space-y-4">
            <div className="space-y-2">
              <StampLabel rotate="left" variant="accent">
                Cambiar quién cobró
              </StampLabel>
              <p className="text-sm text-text-secondary">
                Vas a cambiar quién cobró en {selectedCount} ingreso{selectedCount === 1 ? '' : 's'}.
              </p>
            </div>

            <Select
              label="Nuevo receptor"
              value={bulkRecipientId}
              onChange={(event) => setBulkRecipientId(event.target.value)}
            >
              <option value="">Selecciona un socio</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.nombre}
                </option>
              ))}
            </Select>

            <p className="text-[11px] text-text-secondary leading-relaxed">
              Se actualizará el campo recibido_por de todos los ingresos seleccionados.
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
    </div>
  );
}
