import { Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../lib/format';
import { formatDate } from '../../lib/date';
import { Button } from '../ui/Button';
import { StampLabel } from '../ui/StampLabel';
import type { Database } from '../../types/database';

type Gasto = Database['public']['Tables']['gastos']['Row'];

type GastoEnriquecido = Gasto & {
  eventos?: { nombre: string } | null;
  profiles?: { nombre: string } | null;
};

interface Props {
  gastos: GastoEnriquecido[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  emptyMessage?: string;
}

export default function GastosTable({
  gastos,
  onEdit,
  onDelete,
  emptyMessage = 'No hay gastos registrados. Crea tu primer gasto.',
}: Props) {
  const handleDelete = async (id: string, concepto: string) => {
    if (!confirm(`¿Eliminar el gasto "${concepto}"?`)) {
      return;
    }
    onDelete(id);
  };

  if (gastos.length === 0) {
    return <div className="text-center py-12 text-text-secondary">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
              Concepto
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
              Fecha
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
              Categoría
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
              Evento
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
              Pagado por
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
          {gastos.map((gasto) => {
            const pagadoEmpresa = gasto.pagado_por === null;
            const socioNombre = gasto.profiles?.nombre ?? '—';

            return (
              <tr
                key={gasto.id}
                className="border-b border-border hover:bg-surface-hover transition-colors"
              >
                <td className="px-4 py-3 text-sm font-medium text-text-primary">
                  {gasto.concepto}
                </td>
                <td
                  className="px-4 py-3 text-sm text-text-secondary"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {formatDate(gasto.fecha)}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {gasto.categoria || 'Otros'}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {gasto.eventos?.nombre || <span className="italic">General</span>}
                </td>
                <td className="px-4 py-3 text-sm">
                  {pagadoEmpresa ? (
                    <span className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">
                      Empresa
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-text-primary">{socioNombre}</span>
                      {gasto.reembolsado ? (
                        <StampLabel rotate="none" variant="accent">
                          Reembolsado
                        </StampLabel>
                      ) : (
                        <StampLabel rotate="none" variant="danger">
                          Pendiente
                        </StampLabel>
                      )}
                    </div>
                  )}
                </td>
                <td
                  className="px-4 py-3 text-sm text-right text-danger"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  −{formatCurrency(gasto.cantidad)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => onEdit(gasto.id)}
                      className="p-2 h-8 w-8"
                      title="Editar gasto"
                    >
                      <Pencil size={16} strokeWidth={1.5} />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(gasto.id, gasto.concepto)}
                      className="p-2 h-8 w-8 text-danger hover:bg-danger-bg"
                      title="Eliminar gasto"
                    >
                      <Trash2 size={16} strokeWidth={1.5} />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
