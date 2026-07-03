import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { StampLabel } from '../ui/StampLabel';
import type { BalanceSocio } from '../../services/balance';

interface Props {
  balances: BalanceSocio[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Math.abs(value));

export default function BalanceLiquidacionPanel({ balances }: Props) {
  const pendientes = useMemo(
    () =>
      balances
        .map((b) => ({ ...b, pendiente: Number(b.totalAportado) }))
        .filter((b) => b.pendiente > 0)
        .sort((a, b) => b.pendiente - a.pendiente),
    [balances],
  );

  const [acreedorId, setAcreedorId] = useState<string>(pendientes[0]?.socio_id ?? '');
  const acreedor = pendientes.find((p) => p.socio_id === acreedorId) ?? pendientes[0] ?? null;
  const deudor = pendientes.find((p) => p.socio_id !== acreedor?.socio_id) ?? null;
  const diferencia = acreedor && deudor ? Math.max(acreedor.pendiente - deudor.pendiente, 0) : 0;

  const [open, setOpen] = useState(false);
  const [cantidad, setCantidad] = useState(diferencia > 0 ? diferencia.toFixed(2) : '0.00');
  const [metodo, setMetodo] = useState<'fondo' | 'directo'>('fondo');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pendientes.length) {
      if (acreedorId) setAcreedorId('');
      return;
    }

    if (!pendientes.some((p) => p.socio_id === acreedorId)) {
      setAcreedorId(pendientes[0].socio_id);
    }
  }, [pendientes, acreedorId]);

  const abrir = () => {
    setCantidad(diferencia > 0 ? diferencia.toFixed(2) : '0.00');
    setMetodo('fondo');
    setError(null);
    setOpen(true);
  };

  const liquidar = async () => {
    if (!acreedor) return;

    const monto = Number.parseFloat(cantidad.replace(',', '.'));
    if (!Number.isFinite(monto) || monto <= 0) {
      setError('La cantidad debe ser mayor que 0.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/balance/liquidar-diferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          socio_acreedor_id: acreedor.socio_id,
          cantidad: monto,
          pagar_desde_fondo: metodo === 'fondo',
          fecha: new Date().toISOString().slice(0, 10),
          concepto:
            metodo === 'fondo'
              ? `Liquidación de diferencia a favor de ${acreedor.nombre}`
              : `Liquidación directa entre socios a favor de ${acreedor.nombre}`,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo liquidar la diferencia');
      }

      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo liquidar la diferencia');
    } finally {
      setSaving(false);
    }
  };

  if (!acreedor || !deudor) {
    return (
      <p className="py-4 text-sm text-text-secondary">
        Se necesitan al menos dos socios con gastos pendientes para calcular diferencia neta.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Select
        label="Socio acreedor"
        value={acreedor?.socio_id ?? ''}
        onChange={(e) => {
          setAcreedorId(e.target.value);
          setOpen(false);
          setError(null);
        }}
      >
        {pendientes.map((p) => (
          <option key={p.socio_id} value={p.socio_id}>
            {p.nombre}
          </option>
        ))}
      </Select>

      <div className="space-y-2 border border-border bg-[#0a0a0a] p-4">
        <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Pendiente por socio</p>
        {pendientes.map((p, idx) => (
          <div key={p.socio_id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <StampLabel rotate={idx % 2 === 0 ? 'left' : 'right'} variant="outline">
                {p.nombre}
              </StampLabel>
            </div>
            <span className="font-semibold text-text-primary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {formatCurrency(p.pendiente)}
            </span>
          </div>
        ))}
      </div>

      <div className="border border-border bg-surface p-4 space-y-2">
        <p className="text-sm text-text-primary">
          {acreedor.nombre} ha puesto {formatCurrency(acreedor.pendiente)} pendientes de reembolso, {deudor.nombre} ha puesto {formatCurrency(deudor.pendiente)} pendientes.
        </p>
        <p className="text-sm text-accent">
          Diferencia neta: {formatCurrency(diferencia)} a favor de {acreedor.nombre}.
        </p>
      </div>

      <Button type="button" variant="primary" onClick={abrir} disabled={diferencia <= 0}>
        Liquidar diferencia
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !saving && setOpen(false)}>
          <div className="w-full max-w-lg border border-border-strong bg-surface p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <StampLabel rotate="left" variant="accent">Liquidación</StampLabel>
              <p className="mt-2 text-sm text-text-secondary">
                Se liquidarán gastos del socio acreedor por orden de fecha (FIFO) y solo en bloques completos.
              </p>
            </div>

            <Input
              label="Cantidad a liquidar"
              type="number"
              min="0"
              step="0.01"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />

            <Select label="Modo de liquidación" value={metodo} onChange={(e) => setMetodo(e.target.value as 'fondo' | 'directo')}>
              <option value="fondo">Se paga desde el fondo</option>
              <option value="directo">{deudor.nombre} le paga directamente a {acreedor.nombre} (fuera del fondo)</option>
            </Select>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={liquidar} isLoading={saving}>
                Confirmar liquidación
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}