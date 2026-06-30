import { Eye, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../lib/format';
import { formatDate } from '../../lib/date';
import { Button } from '../ui/Button';
import { StampLabel } from '../ui/StampLabel';
import type { Database } from '../../types/database';

type Evento = Database['public']['Tables']['eventos']['Row'];

interface Props {
  eventos: Evento[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const estadoStamp: Record<string, { variant: 'outline' | 'accent' | 'danger'; rotate: 'left' | 'right' | 'none' }> = {
  pendiente: { variant: 'outline', rotate: 'left' },
  confirmado: { variant: 'accent', rotate: 'right' },
  completado: { variant: 'outline', rotate: 'right' },
  cancelado: { variant: 'danger', rotate: 'left' },
};

const estadoLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

export default function EventosTable({ eventos, onEdit, onDelete }: Props) {
  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el evento "${nombre}"?\n\nEsto también eliminará todos los pagos, gastos y repartos asociados.`)) {
      return;
    }
    onDelete(id);
  };

  const handleViewDetail = (id: string) => {
    window.location.href = `/eventos/${id}/detalle`;
  };

  if (eventos.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        No hay eventos registrados. Crea tu primer evento.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Nombre</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Fecha</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Lugar</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Cliente</th>
            <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Presupuesto</th>
            <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Estado</th>
            <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((evento) => {
            const stamp = estadoStamp[evento.estado] ?? estadoStamp.pendiente;
            return (
              <tr key={evento.id} className="border-b border-border hover:bg-surface-hover transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-text-primary">{evento.nombre}</td>
                <td className="px-4 py-3 text-sm text-text-secondary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {formatDate(evento.fecha)}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">{evento.lugar || '—'}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{evento.cliente || '—'}</td>
                <td
                  className="px-4 py-3 text-sm text-right text-accent"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {formatCurrency(evento.presupuesto)}
                </td>
                <td className="px-4 py-3 text-center">
                  <StampLabel variant={stamp.variant} rotate={stamp.rotate}>
                    {estadoLabels[evento.estado]}
                  </StampLabel>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => handleViewDetail(evento.id)}
                      className="p-2 h-8 w-8"
                      title="Ver detalle"
                    >
                      <Eye size={16} strokeWidth={1.5} />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => onEdit(evento.id)}
                      className="p-2 h-8 w-8"
                      title="Editar"
                    >
                      <Pencil size={16} strokeWidth={1.5} />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(evento.id, evento.nombre)}
                      className="p-2 h-8 w-8 text-danger hover:bg-danger-bg"
                      title="Eliminar"
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
