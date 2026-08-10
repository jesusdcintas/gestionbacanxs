import { useMemo, useState } from 'react';
import TimeRangeSelector from '../ui/TimeRangeSelector';
import { filterByTimeRange, type TimeRange } from '../../lib/timeRange';

interface BalanceMonthData {
  mes: string;
  ingresos: number;
  gastos: number;
  beneficio: number;
}

interface Props {
  monthlyData: BalanceMonthData[];
}

function rangeLabel(range: TimeRange) {
  if (range === '1M') return '1M';
  if (range === '3M') return '3M';
  if (range === '6M') return '6M';
  if (range === '1A') return '1A';
  return 'TODO';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function BalancePeriodoPanel({ monthlyData }: Props) {
  const [range, setRange] = useState<TimeRange>('6M');

  const filteredData = useMemo(() => filterByTimeRange(monthlyData, range), [monthlyData, range]);

  const totalIngresos = useMemo(
    () => filteredData.reduce((sum, item) => sum + Number(item.ingresos), 0),
    [filteredData],
  );
  const totalGastos = useMemo(
    () => filteredData.reduce((sum, item) => sum + Number(item.gastos), 0),
    [filteredData],
  );
  const beneficio = totalIngresos - totalGastos;
  const label = rangeLabel(range);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Tramo de tiempo</p>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="border border-border bg-surface p-5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Ingresos ({label})</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            {formatCurrency(totalIngresos)}
          </p>
        </div>
        <div className="border border-border bg-surface p-5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Gastos ({label})</p>
          <p className="mt-2 text-2xl font-semibold text-danger" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            -{formatCurrency(totalGastos)}
          </p>
        </div>
        <div className="border border-border bg-surface p-5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Beneficio ({label})</p>
          <p
            className={`mt-2 text-2xl font-semibold ${beneficio >= 0 ? 'text-accent' : 'text-danger'}`}
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            {beneficio >= 0 ? '+' : '-'}{formatCurrency(Math.abs(beneficio))}
          </p>
        </div>
      </div>
    </div>
  );
}
