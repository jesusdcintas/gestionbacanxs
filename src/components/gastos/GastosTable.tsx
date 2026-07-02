import { formatCurrency } from '../../lib/format';
import { formatDate } from '../../lib/date';
import { StampLabel } from '../ui/StampLabel';
import type { Database } from '../../types/database';

type Gasto = Database['public']['Tables']['gastos']['Row'];

type GastoEnriquecido = Gasto & {
  eventos?: { nombre: string } | null;
  gasto_pagos?: (
    Database['public']['Tables']['gasto_pagos']['Row'] & {
      profiles?: { nombre: string } | null;
    }
  )[];
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
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Tipo</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Evento</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Pagado por</th>
            <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {gastos.map((gasto) => {
            const fuentes = (gasto.gasto_pagos ?? []).filter((f) => Number(f.cantidad) > 0);
            const totalSocios = fuentes
              .filter((f) => f.socio_id !== null)
              .reduce((sum, f) => sum + Number(f.cantidad), 0);

            const fuenteTexto =
              fuentes.length === 0
                ? '—'
                : fuentes
                    .map((f) => {
                      const nombre = f.socio_id === null ? 'Fondo' : (f.profiles?.nombre ?? 'Socio');
                      return `${nombre} ${formatCurrency(Number(f.cantidad))}`;
                    })
                    .join(' + ');

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
                <td className="px-4 py-3 text-sm">
                  {gasto.tipo_gasto === 'inversion_empresa' ? (
                    <StampLabel rotate="none" variant="accent">Inversión</StampLabel>
                  ) : (
                    <StampLabel rotate="none" variant="outline">Evento</StampLabel>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {gasto.eventos?.nombre || <span className="italic">General</span>}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary">{fuenteTexto}</span>
                    {totalSocios > 0 &&
                      (gasto.reembolsado ? (
                        <StampLabel rotate="none" variant="accent">Reembolsado</StampLabel>
                      ) : (
                        <StampLabel rotate="none" variant="danger">Pendiente</StampLabel>
                      ))}
                  </div>
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
