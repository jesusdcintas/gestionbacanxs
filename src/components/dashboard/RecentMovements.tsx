import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { DashboardMovement } from '../../services/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { StampLabel } from '../ui/StampLabel';
import { formatDate } from '../../utils/format';

interface RecentMovementsProps {
  movements: DashboardMovement[];
}

export function RecentMovements({ movements }: RecentMovementsProps) {
  return (
    <Card>
      <CardHeader>
        <StampLabel rotate="right">Últimos movimientos</StampLabel>
        <CardTitle className="mt-3">Últimos movimientos</CardTitle>
        <CardDescription className="mt-1">Ingresos y gastos recientes registrados en el sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        {movements.length > 0 ? (
          <ul className="space-y-2">
            {movements.map((movement) => {
              const isIncome = movement.type === 'ingreso';
              const Icon = isIncome ? ArrowUpRight : ArrowDownLeft;
              const valueColor = isIncome ? 'text-accent' : 'text-danger';

              return (
                <li
                  className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0"
                  key={movement.id}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`h-4 w-4 mt-0.5 ${valueColor}`} strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{movement.title}</p>
                      <p className="text-xs text-text-secondary">
                        {movement.detail} ·{' '}
                        <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>{formatDate(movement.date)}</span>
                      </p>
                    </div>
                  </div>
                  <div
                    className={`text-sm font-semibold ${valueColor}`}
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {movement.formattedAmount}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary">Todavía no hay movimientos registrados para mostrar.</p>
        )}
      </CardContent>
    </Card>
  );
}
