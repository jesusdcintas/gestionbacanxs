import { formatCurrency } from '../../lib/format';
import { formatDate } from '../../lib/date';
import { StampLabel } from '../ui/StampLabel';
import type { Database } from '../../types/database';

type Gasto = Database['public']['Tables']['gastos']['Row'];

type GastoEnriquecido = Gasto & {
  eventos?: { nombre: string } | null;
  profiles?: { nombre: string } | null;
};

interface Props {
  gastos: GastoEnriquecido[];
  editBasePath: string;
  emptyMessage?: string;
}

export default function GastosTable({
  gastos,
  editBasePath,
  emptyMessage = 'No hay gastos registrados. Crea tu primer gasto.',
}: Props) {
  if (gastos.length === 0) {
    return <div className="text-center py-12 text-text-secondary">{emptyMessage}</div>;
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
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Categoría</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Evento</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Pagado por</th>
            <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {gastos.map((gasto) => {
            const pagadoEmpresa = gasto.pagado_por === null;
            const socioNombre = gasto.profiles?.nombre ?? '—';

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
                <td className="px-4 py-3 text-sm font-medium text-text-primary">{gasto.concepto}</td>
                <td className="px-4 py-3 text-sm text-text-secondary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {formatDate(gasto.fecha)}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">{gasto.categoria || 'Otros'}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {gasto.eventos?.nombre || <span className="italic">General</span>}
                </td>
                <td className="px-4 py-3 text-sm">
                  {pagadoEmpresa ? (
                    <span className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Empresa</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-text-primary">{socioNombre}</span>
                      {gasto.reembolsado ? (
                        <StampLabel rotate="none" variant="accent">Reembolsado</StampLabel>
                      ) : (
                        <StampLabel rotate="none" variant="danger">Pendiente</StampLabel>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm text-danger" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  −{formatCurrency(gasto.cantidad)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
