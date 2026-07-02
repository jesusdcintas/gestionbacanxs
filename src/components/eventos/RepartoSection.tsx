import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { StampLabel } from '../ui/StampLabel';

interface Socio {
  id: string;
  nombre: string;
}

interface RepartoHistorico {
  id: string;
  socio_id: string | null;
  nombre: string;
  cantidad: number;
  fecha: string;
  concepto: string | null;
  created_at?: string | null;
}

interface Props {
  eventoId: string;
  socios: Socio[];
  repartosIniciales: RepartoHistorico[];
  netoRepartible: number;
}

export default function RepartoSection({
  eventoId,
  socios,
  repartosIniciales,
  netoRepartible,
}: Props) {
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    socios.forEach((socio) => {
      inicial[socio.id] = '0';
    });
    inicial.fondo = '0';
    return inicial;
  });
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [concepto, setConcepto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const yaRepartido = useMemo(
    () => repartosIniciales.reduce((sum, r) => sum + Number(r.cantidad), 0),
    [repartosIniciales],
  );
  const pendiente = netoRepartible - yaRepartido;

  const totalTanda = useMemo(
    () => Object.values(asignaciones).reduce((sum, val) => sum + (parseFloat(val) || 0), 0),
    [asignaciones],
  );

  const excedePendiente = totalTanda > pendiente + 0.01;
  const puedeGuardar = totalTanda > 0 && !excedePendiente;

  const setAsignacion = (key: string, value: string) => {
    setAsignaciones((prev) => ({ ...prev, [key]: value }));
  };

  const limpiarTanda = () => {
    const limpio: Record<string, string> = {};
    socios.forEach((socio) => {
      limpio[socio.id] = '0';
    });
    limpio.fondo = '0';
    setAsignaciones(limpio);
    setConcepto('');
  };

  const repartirPendienteEquitativamente = () => {
    if (socios.length === 0) return;

    const monto = Number(pendiente.toFixed(2));
    if (monto <= 0) {
      window.alert('No hay saldo pendiente para repartir.');
      return;
    }

    const totalCentimos = Math.round(monto * 100);
    const baseCentimos = Math.floor(totalCentimos / socios.length);
    const restoCentimos = totalCentimos - baseCentimos * socios.length;

    const next: Record<string, string> = {};
    socios.forEach((socio, index) => {
      const centimos = baseCentimos + (index < restoCentimos ? 1 : 0);
      next[socio.id] = (centimos / 100).toFixed(2);
    });
    next.fondo = '0.00';

    setAsignaciones(next);
    if (!concepto.trim()) {
      setConcepto('Reparto equitativo');
    }
  };

  const handleGuardar = async () => {
    if (!puedeGuardar) {
      window.alert('La tanda supera lo pendiente por repartir o está vacía');
      return;
    }

    const repartos = [
      ...socios.map((socio) => ({
        socio_id: socio.id,
        cantidad: parseFloat(asignaciones[socio.id] || '0') || 0,
      })),
      {
        socio_id: null,
        cantidad: parseFloat(asignaciones.fondo || '0') || 0,
      },
    ].filter((item) => item.cantidad > 0);

    setGuardando(true);
    try {
      const response = await fetch(`/api/repartos/${eventoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          concepto: concepto.trim() || null,
          repartos,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo registrar la tanda de reparto');
      }

      limpiarTanda();
      window.location.reload();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al guardar reparto';
      window.alert(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card>
      <div className="space-y-5">
        <div className="flex flex-col gap-2">
          <StampLabel rotate="right">Repartos acumulativos</StampLabel>
          <p className="text-sm text-text-secondary">
            Neto total:{' '}
            <span style={{ fontFamily: '"JetBrains Mono", monospace' }} className="text-accent font-semibold">
              {netoRepartible.toFixed(2)} €
            </span>
            {' · '}
            Ya repartido:{' '}
            <span style={{ fontFamily: '"JetBrains Mono", monospace' }} className="text-text-primary font-semibold">
              {yaRepartido.toFixed(2)} €
            </span>
            {' · '}
            Pendiente:{' '}
            <span
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
              className={pendiente >= 0 ? 'text-accent font-semibold' : 'text-danger font-semibold'}
            >
              {pendiente.toFixed(2)} €
            </span>
          </p>
        </div>

        <div className="border border-border p-4 bg-[#0a0a0a] space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="Fecha de la tanda"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
            <Input
              label="Concepto"
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Señal, pago final..."
            />
          </div>

          <div className="space-y-3">
            {socios.map((socio) => (
              <div key={socio.id} className="flex items-center gap-3 border border-border p-3">
                <span className="flex-1 text-sm text-text-primary font-medium">{socio.nombre}</span>
                <div className="w-36">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={asignaciones[socio.id] || '0'}
                    onChange={(e) => setAsignacion(socio.id, e.target.value)}
                  />
                </div>
                <span className="text-sm text-text-secondary">€</span>
              </div>
            ))}

            <div className="flex items-center gap-3 border-2 border-accent/40 p-3">
              <div className="flex flex-1 items-center gap-2">
                <StampLabel variant="accent" rotate="left">Fondo</StampLabel>
                <span className="text-sm text-text-primary font-medium">Reinversión / Fondo</span>
              </div>
              <div className="w-36">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={asignaciones.fondo || '0'}
                  onChange={(e) => setAsignacion('fondo', e.target.value)}
                />
              </div>
              <span className="text-sm text-text-secondary">€</span>
            </div>
          </div>

          <div
            className={`p-3 border ${excedePendiente ? 'border-danger/60 bg-danger-bg' : 'border-accent/40 bg-[#111]'}`}
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            <p className="text-sm text-text-primary">
              Tanda actual: {totalTanda.toFixed(2)} € · Pendiente tras guardar:{' '}
              {(pendiente - totalTanda).toFixed(2)} €
            </p>
            {excedePendiente && (
              <p className="text-xs text-danger mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                La tanda supera lo pendiente por repartir.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={repartirPendienteEquitativamente}
              disabled={guardando || socios.length === 0 || pendiente <= 0}
            >
              Repartir pendiente equitativamente
            </Button>
            <Button variant="primary" onClick={handleGuardar} disabled={!puedeGuardar || guardando}>
              {guardando ? 'Guardando...' : 'Registrar tanda'}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <StampLabel rotate="left">Histórico de repartos</StampLabel>
          {repartosIniciales.length === 0 ? (
            <p className="text-sm text-text-secondary">Aún no hay repartos registrados en este evento.</p>
          ) : (
            <div className="space-y-2">
              {repartosIniciales.map((item) => (
                <div key={item.id} className="border border-border p-3 bg-[#0a0a0a]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-text-primary font-medium">{item.nombre}</p>
                      <p className="text-xs text-text-secondary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {item.fecha}{item.concepto ? ` · ${item.concepto}` : ''}
                      </p>
                    </div>
                    <p className="text-sm text-accent font-semibold" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      {Number(item.cantidad).toFixed(2)} €
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
