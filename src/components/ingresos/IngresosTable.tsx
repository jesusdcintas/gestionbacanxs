import { Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../lib/format';
import { formatDate } from '../../lib/date';
import { Button } from '../ui/Button';
import type { Database } from '../../types/database';

type Ingreso = Database['public']['Tables']['pagos_evento']['Row'];

interface Props {
  ingresos: (Ingreso & { eventos?: { nombre: string } | null })[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function IngresosTable({ ingresos, onEdit, onDelete }: Props) {
  const handleDelete = async (id: string, concepto: string | null) => {
    const label = concepto || 'sin concepto';
    if (!confirm(`¿Eliminar el ingreso "${label}"?`)) {
      return;
    }
    onDelete(id);
  };

  if (ingresos.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        No hay ingresos registrados. Crea tu primer ingreso.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Concepto</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Fecha</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Evento</th>
            <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Cantidad</th>
            <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {ingresos.map((ingreso) => (
            <tr key={ingreso.id} className="border-b border-border hover:bg-surface-hover transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-text-primary">{ingreso.concepto || '—'}</td>
              <td className="px-4 py-3 text-sm text-text-secondary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                {formatDate(ingreso.fecha)}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">
                {ingreso.eventos?.nombre || '—'}
              </td>
              <td
                className="px-4 py-3 text-sm text-right text-accent"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {formatCurrency(ingreso.cantidad)}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => onEdit(ingreso.id)}
                    className="p-2 h-8 w-8"
                    title="Editar ingreso"
                  >
                    <Pencil size={16} strokeWidth={1.5} />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(ingreso.id, ingreso.concepto)}
                    className="p-2 h-8 w-8 text-danger hover:bg-danger-bg"
                    title="Eliminar ingreso"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
