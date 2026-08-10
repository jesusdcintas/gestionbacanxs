import { Fragment, useState, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import type { BalanceSocio, PendientesDetallePorSocio, RepartosDetallePorSocio } from '../../services/balance';
import { StampLabel } from '../ui/StampLabel';

interface Props {
  balances: BalanceSocio[];
  repartosDetallePorSocio: RepartosDetallePorSocio;
  pendientesDetallePorSocio: PendientesDetallePorSocio;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Math.abs(value));

const formatDate = (value: string | null) => {
  if (!value) return '—';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

export default function BalanceSociosTable({
  balances,
  repartosDetallePorSocio,
  pendientesDetallePorSocio,
}: Props) {
  const [expandedPendienteSocioId, setExpandedPendienteSocioId] = useState<string | null>(null);
  const [expandedSocioId, setExpandedSocioId] = useState<string | null>(null);

  const togglePendienteRow = (socioId: string) => {
    setExpandedPendienteSocioId((prev) => (prev === socioId ? null : socioId));
  };

  const toggleRepartoRow = (socioId: string) => {
    setExpandedSocioId((prev) => (prev === socioId ? null : socioId));
  };

  const onPendienteRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, socioId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      togglePendienteRow(socioId);
    }
  };

  const onRepartoRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, socioId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleRepartoRow(socioId);
    }
  };

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
              {balances.map((b, idx) => {
                const isExpanded = expandedPendienteSocioId === b.socio_id;
                const detalles = pendientesDetallePorSocio[b.socio_id] ?? [];

                return (
                  <Fragment key={`pendiente-${b.socio_id}`}>
                    <tr
                      className={`border-b border-border transition-colors ${
                        isExpanded ? 'bg-surface-hover' : 'hover:bg-surface-hover'
                      } cursor-pointer`}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      onClick={() => togglePendienteRow(b.socio_id)}
                      onKeyDown={(event) => onPendienteRowKeyDown(event, b.socio_id)}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={`h-4 w-4 text-accent transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : 'rotate-0'
                            }`}
                            strokeWidth={1.75}
                          />
                          <StampLabel rotate={idx % 2 === 0 ? 'left' : 'right'} variant="outline">
                            {b.nombre}
                          </StampLabel>
                        </div>
                      </td>
                      <td
                        className="py-3 px-3 text-right font-semibold text-text-primary"
                        style={{ fontFamily: '"JetBrains Mono", monospace' }}
                      >
                        {formatCurrency(b.totalAportado)}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="border-b border-border bg-[#121212]">
                        <td colSpan={2} className="px-3 pb-4 pt-1">
                          <div className="ml-6 border border-border bg-surface/40 p-3">
                            {detalles.length === 0 ? (
                              <p className="text-sm text-text-secondary">
                                Sin gastos pendientes registrados
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-border">
                                      <th className="text-left py-2 pr-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                                        Concepto
                                      </th>
                                      <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                                        Fecha
                                      </th>
                                      <th className="text-right py-2 pl-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                                        Importe
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detalles.map((detalle) => (
                                      <tr
                                        key={`${b.socio_id}-${detalle.gasto_id}`}
                                        className="border-b border-border/70 last:border-0"
                                      >
                                        <td className="py-2 pr-3 text-text-primary">{detalle.concepto}</td>
                                        <td
                                          className="py-2 px-3 text-text-secondary"
                                          style={{ fontFamily: '"JetBrains Mono", monospace' }}
                                        >
                                          {formatDate(detalle.fecha)}
                                        </td>
                                        <td
                                          className="py-2 pl-3 text-right text-text-primary"
                                          style={{ fontFamily: '"JetBrains Mono", monospace' }}
                                        >
                                          {formatCurrency(detalle.importe)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
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
                const isExpanded = expandedSocioId === b.socio_id;
                const detalles = repartosDetallePorSocio[b.socio_id] ?? [];

                return (
                  <Fragment key={`repartos-${b.socio_id}`}>
                    <tr
                      className={`border-b border-border transition-colors ${
                        isExpanded ? 'bg-surface-hover' : 'hover:bg-surface-hover'
                      } cursor-pointer`}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      onClick={() => toggleRepartoRow(b.socio_id)}
                      onKeyDown={(event) => onRepartoRowKeyDown(event, b.socio_id)}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={`h-4 w-4 text-accent transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : 'rotate-0'
                            }`}
                            strokeWidth={1.75}
                          />
                          <StampLabel rotate={idx % 2 === 0 ? 'left' : 'right'} variant="outline">
                            {b.nombre}
                          </StampLabel>
                        </div>
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

                    {isExpanded && (
                      <tr className="border-b border-border bg-[#121212]">
                        <td colSpan={4} className="px-3 pb-4 pt-1">
                          <div className="ml-6 border border-border bg-surface/40 p-3">
                            {detalles.length === 0 ? (
                              <p className="text-sm text-text-secondary">
                                Sin repartos registrados todavía
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-border">
                                      <th className="text-left py-2 pr-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                                        Evento
                                      </th>
                                      <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                                        Fecha
                                      </th>
                                      <th className="text-right py-2 pl-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                                        Importe cobrado
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detalles.map((detalle) => (
                                      <tr
                                        key={`${b.socio_id}-${detalle.evento_id}`}
                                        className="border-b border-border/70 last:border-0"
                                      >
                                        <td className="py-2 pr-3 text-text-primary">{detalle.eventoNombre}</td>
                                        <td
                                          className="py-2 px-3 text-text-secondary"
                                          style={{ fontFamily: '"JetBrains Mono", monospace' }}
                                        >
                                          {formatDate(detalle.eventoFecha)}
                                        </td>
                                        <td
                                          className="py-2 pl-3 text-right text-text-primary"
                                          style={{ fontFamily: '"JetBrains Mono", monospace' }}
                                        >
                                          {formatCurrency(detalle.totalCobrado)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
