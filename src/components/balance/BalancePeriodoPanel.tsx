import { useMemo, useState, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
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
  ingresosDetalle: {
    id: string;
    fecha: string;
    cantidad: number;
    concepto: string | null;
    eventoNombre: string | null;
  }[];
  gastosDetalle: {
    id: string;
    fecha: string;
    cantidad: number;
    concepto: string;
    categoria: string;
    tipo_gasto: 'directo_evento' | 'inversion_empresa';
  }[];
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function toMonthKey(dateValue: string) {
  const d = new Date(dateValue);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function BalancePeriodoPanel({ monthlyData, ingresosDetalle, gastosDetalle }: Props) {
  const [range, setRange] = useState<TimeRange>('6M');
  const [expandedCard, setExpandedCard] = useState<'ingresos' | 'gastos' | null>(null);

  // Se conserva por compatibilidad de contrato del componente.
  void monthlyData;

  const filteredIngresos = useMemo(
    () =>
      filterByTimeRange(
        ingresosDetalle.map((item) => ({ ...item, mes: toMonthKey(item.fecha) })),
        range,
      )
        .map(({ mes, ...item }) => item)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [ingresosDetalle, range],
  );

  const filteredGastos = useMemo(
    () =>
      filterByTimeRange(
        gastosDetalle.map((item) => ({ ...item, mes: toMonthKey(item.fecha) })),
        range,
      )
        .map(({ mes, ...item }) => item)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [gastosDetalle, range],
  );

  const totalIngresos = useMemo(
    () => filteredIngresos.reduce((sum, item) => sum + Number(item.cantidad), 0),
    [filteredIngresos],
  );

  const totalGastos = useMemo(
    () => filteredGastos.reduce((sum, item) => sum + Number(item.cantidad), 0),
    [filteredGastos],
  );

  const beneficio = totalIngresos - totalGastos;
  const label = rangeLabel(range);

  const toggleCard = (card: 'ingresos' | 'gastos') => {
    setExpandedCard((prev) => (prev === card ? null : card));
  };

  const onCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, card: 'ingresos' | 'gastos') => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleCard(card);
    }
  };

  const isIngresosExpanded = expandedCard === 'ingresos';
  const isGastosExpanded = expandedCard === 'gastos';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Tramo de tiempo</p>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div
          className={`border border-border bg-surface p-5 transition-colors cursor-pointer ${
            isIngresosExpanded ? 'bg-surface-hover' : 'hover:bg-surface-hover'
          }`}
          role="button"
          tabIndex={0}
          aria-expanded={isIngresosExpanded}
          onClick={() => toggleCard('ingresos')}
          onKeyDown={(event) => onCardKeyDown(event, 'ingresos')}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Ingresos ({label})</p>
            <ChevronDown
              className={`h-4 w-4 text-accent transition-transform duration-200 ${
                isIngresosExpanded ? 'rotate-180' : 'rotate-0'
              }`}
              strokeWidth={1.75}
            />
          </div>
          <p className="mt-2 text-2xl font-semibold text-text-primary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            {formatCurrency(totalIngresos)}
          </p>

          {isIngresosExpanded && (
            <div className="mt-4 border border-border bg-surface/40 p-3">
              {filteredIngresos.length === 0 ? (
                <p className="text-sm text-text-secondary">No hay ingresos en este tramo.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                          Fecha
                        </th>
                        <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                          Evento / concepto
                        </th>
                        <th className="text-right py-2 pl-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                          Importe
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIngresos.map((item) => (
                        <tr key={item.id} className="border-b border-border/70 last:border-0">
                          <td
                            className="py-2 pr-3 text-text-secondary"
                            style={{ fontFamily: '"JetBrains Mono", monospace' }}
                          >
                            {formatDate(item.fecha)}
                          </td>
                          <td className="py-2 px-3 text-text-primary">
                            {item.eventoNombre?.trim() || item.concepto?.trim() || 'Ingreso sin detalle'}
                          </td>
                          <td
                            className="py-2 pl-3 text-right text-text-primary"
                            style={{ fontFamily: '"JetBrains Mono", monospace' }}
                          >
                            {formatCurrency(item.cantidad)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className={`border border-border bg-surface p-5 transition-colors cursor-pointer ${
            isGastosExpanded ? 'bg-surface-hover' : 'hover:bg-surface-hover'
          }`}
          role="button"
          tabIndex={0}
          aria-expanded={isGastosExpanded}
          onClick={() => toggleCard('gastos')}
          onKeyDown={(event) => onCardKeyDown(event, 'gastos')}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Gastos ({label})</p>
            <ChevronDown
              className={`h-4 w-4 text-accent transition-transform duration-200 ${
                isGastosExpanded ? 'rotate-180' : 'rotate-0'
              }`}
              strokeWidth={1.75}
            />
          </div>
          <p className="mt-2 text-2xl font-semibold text-danger" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            -{formatCurrency(totalGastos)}
          </p>

          {isGastosExpanded && (
            <div className="mt-4 border border-border bg-surface/40 p-3">
              {filteredGastos.length === 0 ? (
                <p className="text-sm text-text-secondary">No hay gastos en este tramo.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                          Fecha
                        </th>
                        <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                          Concepto
                        </th>
                        <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                          Categoría
                        </th>
                        <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                          Tipo
                        </th>
                        <th className="text-right py-2 pl-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                          Importe
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGastos.map((item) => (
                        <tr key={item.id} className="border-b border-border/70 last:border-0">
                          <td
                            className="py-2 pr-3 text-text-secondary"
                            style={{ fontFamily: '"JetBrains Mono", monospace' }}
                          >
                            {formatDate(item.fecha)}
                          </td>
                          <td className="py-2 px-3 text-text-primary">{item.concepto}</td>
                          <td className="py-2 px-3 text-text-secondary">{item.categoria}</td>
                          <td className="py-2 px-3 text-text-secondary">{item.tipo_gasto}</td>
                          <td
                            className="py-2 pl-3 text-right text-text-primary"
                            style={{ fontFamily: '"JetBrains Mono", monospace' }}
                          >
                            {formatCurrency(item.cantidad)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
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
