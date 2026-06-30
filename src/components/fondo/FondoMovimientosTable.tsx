import { ArrowDownLeft, ArrowUpRight, Trash2 } from 'lucide-react';
import { StampLabel } from '../ui/StampLabel';

export interface MovimientoFondo {
  id: string;
  fecha: string;
  concepto: string;
  cantidad: number;
  evento_id: string | null;
  gasto_id: string | null;
  eventos?: { nombre: string } | null;
  gastos?: { concepto: string } | null;
}

interface Props {
  movimientos: MovimientoFondo[];
  onDelete?: (id: string) => void;
}

export default function FondoMovimientosTable({ movimientos, onDelete }: Props) {
  if (movimientos.length === 0) {
    return (
      <p className="text-sm text-text-secondary text-center py-8">
        No hay movimientos registrados en el fondo de empresa.
      </p>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Math.abs(value));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
              Fecha
            </th>
            <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
              Tipo
            </th>
            <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
              Concepto
            </th>
            <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
              Origen
            </th>
            <th className="text-right py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
              Cantidad
            </th>
            {onDelete && <th className="w-12"></th>}
          </tr>
        </thead>
        <tbody>
          {movimientos.map((mov) => {
            const esEntrada = mov.cantidad >= 0;
            const Icon = esEntrada ? ArrowUpRight : ArrowDownLeft;
            const color = esEntrada ? 'text-accent' : 'text-danger';
            const origen = mov.eventos?.nombre
              ? `Evento · ${mov.eventos.nombre}`
              : mov.gastos?.concepto
                ? `Gasto · ${mov.gastos.concepto}`
                : 'Manual';

            return (
              <tr
                key={mov.id}
                className="border-b border-border hover:bg-surface-hover transition-colors"
              >
                <td
                  className="py-3 px-3 text-text-primary"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {mov.fecha}
                </td>
                <td className="py-3 px-3">
                  <Icon className={`h-4 w-4 ${color}`} strokeWidth={1.5} />
                </td>
                <td className="py-3 px-3 text-text-primary">{mov.concepto}</td>
                <td className="py-3 px-3 text-text-secondary text-xs">
                  {mov.evento_id || mov.gasto_id ? (
                    <StampLabel rotate="none">{origen.split(' · ')[0]}</StampLabel>
                  ) : (
                    <span className="text-[11px] uppercase tracking-[0.08em]">Manual</span>
                  )}
                  {(mov.evento_id || mov.gasto_id) && (
                    <span className="ml-2 text-text-secondary">{origen.split(' · ')[1]}</span>
                  )}
                </td>
                <td
                  className={`py-3 px-3 text-right font-semibold ${color}`}
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {esEntrada ? '+' : '−'}
                  {formatCurrency(mov.cantidad)}
                </td>
                {onDelete && (
                  <td className="py-3 px-3 text-right">
                    {!mov.evento_id && !mov.gasto_id && (
                      <button
                        type="button"
                        onClick={() => onDelete(mov.id)}
                        className="text-text-secondary hover:text-danger transition-colors"
                        aria-label="Eliminar movimiento"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
