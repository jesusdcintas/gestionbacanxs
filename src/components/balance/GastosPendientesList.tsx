import { useState } from 'react';
import { Check, Receipt } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { StampLabel } from '../ui/StampLabel';
import type { GastoPendienteReembolso } from '../../services/balance';

interface Props {
  gastos: GastoPendienteReembolso[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

export default function GastosPendientesList({ gastos: gastosIniciales }: Props) {
  const [gastos, setGastos] = useState(gastosIniciales);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPendiente = gastos.reduce((sum, g) => sum + g.cantidad, 0);

  const abrirModal = (gastoId: string) => {
    setSeleccionado(gastoId);
    setFecha(new Date().toISOString().split('T')[0]);
    setError(null);
  };

  const cerrarModal = () => {
    setSeleccionado(null);
    setError(null);
    setEnviando(false);
  };

  const confirmarReembolso = async () => {
    if (!seleccionado) return;
    setEnviando(true);
    setError(null);
    try {
      const response = await fetch('/api/reembolsos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gasto_id: seleccionado, fecha }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo reembolsar el gasto');
      }

      setGastos((prev) => prev.filter((g) => g.id !== seleccionado));
      cerrarModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setEnviando(false);
    }
  };

  if (gastos.length === 0) {
    return (
      <div className="py-8 text-center">
        <Check className="mx-auto h-10 w-10 text-accent" strokeWidth={1.5} />
        <p className="mt-3 text-sm text-text-secondary">
          No hay gastos pendientes de reembolso. ¡Todo al día!
        </p>
      </div>
    );
  }

  const gastoSeleccionado = gastos.find((g) => g.id === seleccionado);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">
          {gastos.length} {gastos.length === 1 ? 'gasto pendiente' : 'gastos pendientes'}
        </p>
        <p
          className="text-sm font-semibold text-danger"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          Total: −{formatCurrency(totalPendiente)}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                Fecha
              </th>
              <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                Socio
              </th>
              <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                Concepto
              </th>
              <th className="text-left py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                Evento
              </th>
              <th className="text-right py-2 px-3 text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
                Cantidad
              </th>
              <th className="w-32"></th>
            </tr>
          </thead>
          <tbody>
            {gastos.map((g) => (
              <tr
                key={g.id}
                className="border-b border-border hover:bg-surface-hover transition-colors"
              >
                <td
                  className="py-3 px-3 text-text-primary"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {g.fecha}
                </td>
                <td className="py-3 px-3">
                  <StampLabel rotate="none" variant="outline">
                    {g.socio_nombre}
                  </StampLabel>
                </td>
                <td className="py-3 px-3 text-text-primary">
                  <div>{g.concepto}</div>
                  <div className="text-[11px] uppercase tracking-[0.08em] text-text-secondary mt-0.5">
                    {g.categoria}
                  </div>
                </td>
                <td className="py-3 px-3 text-text-secondary text-xs">
                  {g.evento_nombre ?? <span className="italic">General</span>}
                </td>
                <td
                  className="py-3 px-3 text-right font-semibold text-danger"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  −{formatCurrency(g.cantidad)}
                </td>
                <td className="py-3 px-3 text-right">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => abrirModal(g.id)}
                  >
                    <Receipt className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Reembolsar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {seleccionado && gastoSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/80 p-4"
          onClick={cerrarModal}
        >
          <div
            className="w-full max-w-md border border-border-strong bg-surface p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <StampLabel rotate="left" variant="accent">
                Confirmar reembolso
              </StampLabel>
            </div>

            <div className="space-y-2 border border-border bg-[#0a0a0a] p-3">
              <div className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">
                Detalle del gasto
              </div>
              <div className="text-sm text-text-primary">{gastoSeleccionado.concepto}</div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">
                  {gastoSeleccionado.socio_nombre} ·{' '}
                  {gastoSeleccionado.evento_nombre ?? 'General'}
                </span>
                <span
                  className="text-sm font-semibold text-danger"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  −{formatCurrency(gastoSeleccionado.cantidad)}
                </span>
              </div>
            </div>

            <Input
              label="Fecha del reembolso"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />

            <p className="text-[11px] text-text-secondary leading-relaxed">
              Se marcará el gasto como reembolsado y se registrará una salida en el fondo de
              empresa por la cantidad indicada.
            </p>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={cerrarModal}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={confirmarReembolso}
                disabled={enviando}
              >
                {enviando ? 'Reembolsando...' : 'Confirmar reembolso'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
