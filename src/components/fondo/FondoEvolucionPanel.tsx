import { useMemo, useState } from 'react';
import { filterByTimeRange, type TimeRange } from '../../lib/timeRange';
import TimeRangeSelector from '../ui/TimeRangeSelector';
import FondoChart from './FondoChart';

interface SaldoMes {
  mes: string;
  saldo: number;
}

interface Props {
  historico: SaldoMes[];
}

export default function FondoEvolucionPanel({ historico }: Props) {
  const [range, setRange] = useState<TimeRange>('6M');

  const filtered = useMemo(() => filterByTimeRange(historico, range), [historico, range]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Tramo de tiempo</p>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>
      <FondoChart data={filtered} />
    </div>
  );
}
