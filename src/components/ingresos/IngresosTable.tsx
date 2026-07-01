import { formatCurrency } from '../../lib/format';
import { formatDate } from '../../lib/date';
import type { Database } from '../../types/database';

type Ingreso = Database['public']['Tables']['pagos_evento']['Row'];

interface Props {
  ingresos: (Ingreso & { eventos?: { nombre: string } | null })[];
  editBasePath: string;
}

export default function IngresosTable({ ingresos, editBasePath }: Props) {
  if (ingresos.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        No hay ingresos registrados. Crea tu primer ingreso.
      </div>
    );
  }

  const openItem = (id: string) => {
    window.location.href = `${editBasePath}/${id}`;
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
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Concepto</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Fecha</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Evento</th>
            <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {ingresos.map((ingreso) => (
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
              <td className="px-4 py-3 text-sm font-medium text-text-primary">{ingreso.concepto || '—'}</td>
              <td className="px-4 py-3 text-sm text-text-secondary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                {formatDate(ingreso.fecha)}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">{ingreso.eventos?.nombre || '—'}</td>
              <td className="px-4 py-3 text-right text-sm text-accent" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                {formatCurrency(ingreso.cantidad)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
