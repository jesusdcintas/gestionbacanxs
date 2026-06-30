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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
              Socio
            </th>
            <th className="text-right py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
              Cobrado
            </th>
            <th className="text-right py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
              Aportado
            </th>
            <th className="text-right py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
              Reembolsado
            </th>
            <th className="text-right py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
              Balance
            </th>
          </tr>
        </thead>
        <tbody>
          {balances.map((b, idx) => {
            const balancePositivo = b.balance > 0;
            const balanceNeutro = b.balance === 0;
            const balanceColor = balanceNeutro
              ? 'text-text-secondary'
              : balancePositivo
                ? 'text-accent'
                : 'text-danger';

            return (
              <tr
                key={b.socio_id}
                className="border-b border-border hover:bg-surface-hover transition-colors"
              >
                <td className="py-3 px-3">
                  <StampLabel
                    rotate={idx % 2 === 0 ? 'left' : 'right'}
                    variant="outline"
                  >
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
                  className="py-3 px-3 text-right text-text-primary"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {formatCurrency(b.totalAportado)}
                </td>
                <td
                  className="py-3 px-3 text-right text-text-secondary"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {formatCurrency(b.totalReembolsado)}
                </td>
                <td
                  className={`py-3 px-3 text-right font-semibold ${balanceColor}`}
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {balanceNeutro ? '' : balancePositivo ? '+' : '−'}
                  {formatCurrency(b.balance)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-text-secondary leading-relaxed">
        Balance = cobrado por repartos − aportado de bolsillo no reembolsado. Positivo (lime) = el
        socio debe recibir; negativo (rojo) = el socio debe aportar.
      </p>
    </div>
  );
}
