import { formatCurrency } from '../../lib/format';
import { formatDate } from '../../lib/date';
import { StampLabel } from '../ui/StampLabel';
import type { Database } from '../../types/database';
import { getEstadoStamp, getEstadoVisible, getEstadoVisibleLabel } from '../../utils/eventoEstado';

type Evento = Database['public']['Tables']['eventos']['Row'];

interface Props {
  eventos: Evento[];
  editBasePath: string;
}

export default function EventosTable({ eventos, editBasePath }: Props) {
  if (eventos.length === 0) {
    return (
      <div className="py-12 text-center text-text-secondary">
        No hay eventos registrados. Crea tu primer evento.
      </div>
    );
  }

  const openItem = (id: string) => {
    window.location.href = `${editBasePath}/${id}/detalle`;
  };

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openItem(id);
    }
  };

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
          </tr>
        </thead>
        <tbody>
          {eventos.map((evento) => {
            const estadoVisible = getEstadoVisible(evento.estado_trabajo, evento.estado_financiero);
            const stamp = getEstadoStamp(estadoVisible);

            return (
              <tr
                key={evento.id}
                className="cursor-pointer border-b border-border transition-colors hover:bg-surface-hover"
                onClick={() => openItem(evento.id)}
                onKeyDown={(event) => handleRowKeyDown(event, evento.id)}
                tabIndex={0}
                role="button"
                aria-label={`Ver evento ${evento.nombre}`}
                title="Ver evento"
              >
                <td className="px-4 py-3 text-sm font-medium text-text-primary">{evento.nombre}</td>
                <td className="px-4 py-3 text-sm text-text-secondary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {formatDate(evento.fecha)}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">{evento.lugar || '—'}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{evento.cliente || '—'}</td>
                <td className="px-4 py-3 text-right text-sm text-accent" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {formatCurrency(evento.presupuesto)}
                </td>
                <td className="px-4 py-3 text-center">
                  <StampLabel variant={stamp.variant} rotate={stamp.rotate}>
                    {getEstadoVisibleLabel(estadoVisible)}
                  </StampLabel>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
