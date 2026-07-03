import type { BalanceSocio } from '../../services/balance';
import { StampLabel } from '../ui/StampLabel';

interface Props {
  balances: BalanceSocio[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Math.abs(value));

export default function BalanceSociosTable({ balances }: Props) {
  if (balances.length === 0) {
    return (
      <p className="text-sm text-text-secondary text-center py-8">
        No hay socios registrados todavía.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <StampLabel rotate="left" variant="danger">Pendiente</StampLabel>
          <h3 className="text-sm uppercase tracking-[0.08em] text-text-primary">
            Pendiente de reembolso entre socios
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                  Socio
                </th>
                <th className="text-right py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                  Aportado pendiente
                </th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b, idx) => (
                <tr
                  key={`pendiente-${b.socio_id}`}
                  className="border-b border-border hover:bg-surface-hover transition-colors"
                >
                  <td className="py-3 px-3">
                    <StampLabel rotate={idx % 2 === 0 ? 'left' : 'right'} variant="outline">
                      {b.nombre}
                    </StampLabel>
                  </td>
                  <td
                    className="py-3 px-3 text-right font-semibold text-text-primary"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {formatCurrency(b.totalAportado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-text-secondary leading-relaxed">
          Esta sección es la base para calcular y liquidar diferencia entre socios.
        </p>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <StampLabel rotate="right" variant="accent">Repartos</StampLabel>
          <h3 className="text-sm uppercase tracking-[0.08em] text-text-primary">
            Repartos cobrados por evento trabajado
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                  Socio
                </th>
                <th className="text-right py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                  Total cobrado en repartos
                </th>
                <th className="text-right py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                  Eventos trabajados
                </th>
                <th className="text-right py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                  Cobrado / evento
                </th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b, idx) => {
                const promedio = b.eventosTrabajados > 0 ? b.totalCobrado / b.eventosTrabajados : 0;

                return (
                  <tr
                    key={`repartos-${b.socio_id}`}
                    className="border-b border-border hover:bg-surface-hover transition-colors"
                  >
                    <td className="py-3 px-3">
                      <StampLabel rotate={idx % 2 === 0 ? 'left' : 'right'} variant="outline">
                        {b.nombre}
                      </StampLabel>
                    </td>
                    <td
                      className="py-3 px-3 text-right text-text-primary"
                      style={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {formatCurrency(b.totalCobrado)}
                    </td>
                    <td
                      className="py-3 px-3 text-right text-text-secondary"
                      style={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {b.eventosTrabajados}
                    </td>
                    <td
                      className="py-3 px-3 text-right text-text-secondary"
                      style={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {formatCurrency(promedio)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-text-secondary leading-relaxed">
          Estos importes reflejan lo cobrado por cada socio en repartos de eventos. No tienen por qué ser iguales entre socios: dependen de cuántos eventos ha trabajado cada uno (ver columna Eventos trabajados).
        </p>
      </div>
    </div>
  );
}
