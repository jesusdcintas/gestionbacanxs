import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { StampLabel } from '../ui/StampLabel';
import { ToastProvider, useToast } from '../ui/Toast';
import type { Database } from '../../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface Props {
  eventoId: string;
  profiles: Profile[];
  socios: Profile[];
}

interface RepartoInputState {
  [key: string]: string;
}

function CobroYRepartoAhoraInner({ eventoId, profiles, socios }: Props) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cobro, setCobro] = useState({
    fecha: new Date().toISOString().split('T')[0],
    cantidad: '',
    recibido_por: '',
    metodo_pago: 'banco',
    concepto_pago: '',
  });
  const [repartos, setRepartos] = useState<RepartoInputState>(() => {
    const initial: RepartoInputState = {};
    socios.forEach((socio) => {
      initial[socio.id] = '0';
    });
    initial.fondo = '0';
    return initial;
  });
  const [repartoConcepto, setRepartoConcepto] = useState('');

  const cantidadCobro = Number.parseFloat(cobro.cantidad || '0') || 0;

  const totalReparto = useMemo(
    () => Object.values(repartos).reduce((sum, value) => sum + (parseFloat(value) || 0), 0),
    [repartos],
  );

  const excedeCobro = totalReparto > cantidadCobro + 0.01;

  const setReparto = (key: string, value: string) => {
    setRepartos((current) => ({ ...current, [key]: value }));
  };

  const reset = () => {
    const initial: RepartoInputState = {};
    socios.forEach((socio) => {
      initial[socio.id] = '0';
    });
    initial.fondo = '0';
    setCobro({
      fecha: new Date().toISOString().split('T')[0],
      cantidad: '',
      recibido_por: '',
      metodo_pago: 'banco',
      concepto_pago: '',
    });
    setRepartos(initial);
    setRepartoConcepto('');
    setErrorMessage(null);
    setOpen(false);
  };

  const repartirTodo = () => {
    if (socios.length === 0) return;

    const monto = Number(cantidadCobro.toFixed(2));
    if (monto <= 0) {
      setErrorMessage('Primero introduce una cantidad cobrada válida.');
      return;
    }

    const totalCentimos = Math.round(monto * 100);
    const baseCentimos = Math.floor(totalCentimos / (socios.length + 1));
    const restoCentimos = totalCentimos - baseCentimos * (socios.length + 1);

    const next: RepartoInputState = {};
    socios.forEach((socio, index) => {
      const centimos = baseCentimos + (index < restoCentimos ? 1 : 0);
      next[socio.id] = (centimos / 100).toFixed(2);
    });
    const fondoCentimos = baseCentimos + (socios.length < restoCentimos ? 1 : 0);
    next.fondo = (fondoCentimos / 100).toFixed(2);
    setRepartos(next);
    if (!repartoConcepto.trim() && cobro.concepto_pago.trim()) {
      setRepartoConcepto(cobro.concepto_pago.trim());
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cantidad = Number.parseFloat(cobro.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setErrorMessage('La cantidad cobrada debe ser mayor que 0.');
      return;
    }

    if (!cobro.recibido_por) {
      setErrorMessage('Debes seleccionar quién cobró.');
      return;
    }

    if (excedeCobro) {
      setErrorMessage('El reparto supera la cantidad cobrada.');
      return;
    }

    const repartoList = [
      ...socios.map((socio) => ({
        socio_id: socio.id,
        cantidad: parseFloat(repartos[socio.id] || '0') || 0,
        concepto: repartoConcepto.trim() || cobro.concepto_pago.trim() || null,
      })),
      {
        socio_id: null,
        cantidad: parseFloat(repartos.fondo || '0') || 0,
        concepto: repartoConcepto.trim() || cobro.concepto_pago.trim() || null,
      },
    ].filter((item) => item.cantidad > 0);

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/eventos/${eventoId}/cobro-y-reparto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cobro,
          cantidad,
          repartos: repartoList,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo registrar el cobro y reparto');
      }

      showToast({
        title: 'Cobro y reparto registrados',
        description: 'Actualizando el detalle del evento.',
        variant: 'success',
      });

      window.setTimeout(() => {
        window.location.reload();
      }, 450);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al registrar cobro y reparto';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <StampLabel rotate="left" variant="accent">
              Cobro rápido
            </StampLabel>
            <h2 className="mt-2 text-xl uppercase italic" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
              Cobrar y repartir ahora
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Registra un cobro y reparte parte o todo en una sola acción.
            </p>
          </div>
          <Button variant="primary" onClick={() => setOpen(true)}>
            Cobrar y repartir ahora
          </Button>
        </div>
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl border border-border-strong bg-surface p-5 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <StampLabel rotate="left" variant="accent">
                  Cobro + reparto
                </StampLabel>
                <h3 className="mt-2 text-2xl uppercase italic" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                  Nuevo cobro combinado
                </h3>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={reset} disabled={loading}>
                Cerrar
              </Button>
            </div>

            {errorMessage ? (
              <div className="border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">{errorMessage}</div>
            ) : null}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4 border border-border bg-[#0a0a0a] p-4">
                <div className="flex items-center justify-between gap-3">
                  <StampLabel rotate="none">Cobro</StampLabel>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Bloque 1</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <Input
                    label="Fecha"
                    type="date"
                    value={cobro.fecha}
                    onChange={(e) => setCobro((current) => ({ ...current, fecha: e.target.value }))}
                    required
                  />
                  <Input
                    label="Cantidad cobrada"
                    type="number"
                    step="0.01"
                    min="0"
                    value={cobro.cantidad}
                    onChange={(e) => setCobro((current) => ({ ...current, cantidad: e.target.value }))}
                    required
                    placeholder="0.00"
                  />
                  <Select
                    label="¿Quién cobró?"
                    value={cobro.recibido_por}
                    onChange={(e) => setCobro((current) => ({ ...current, recibido_por: e.target.value }))}
                    required
                  >
                    <option value="">Selecciona quién cobró</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.nombre}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Método"
                    value={cobro.metodo_pago}
                    onChange={(e) => setCobro((current) => ({ ...current, metodo_pago: e.target.value }))}
                  >
                    <option value="banco">Banco</option>
                    <option value="efectivo">Efectivo</option>
                  </Select>
                  <Input
                    label="Concepto"
                    type="text"
                    value={cobro.concepto_pago}
                    onChange={(e) => setCobro((current) => ({ ...current, concepto_pago: e.target.value }))}
                    placeholder="Ej: Resto tras evento"
                  />
                </div>
              </div>

              <div className="space-y-4 border border-border bg-[#0a0a0a] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <StampLabel rotate="none">Reparto</StampLabel>
                    <p className="mt-2 text-sm text-text-secondary">
                      Repartiendo:{' '}
                      <span className="font-semibold text-accent" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {cantidadCobro.toFixed(2)} €
                      </span>
                    </p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={repartirTodo} disabled={cantidadCobro <= 0}>
                    Repartir todo
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {socios.map((socio) => (
                    <div key={socio.id} className="flex items-center gap-3 border border-border p-3">
                      <span className="flex-1 text-sm text-text-primary font-medium">{socio.nombre}</span>
                      <div className="w-36">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={repartos[socio.id] ?? ''}
                          onChange={(e) => setReparto(socio.id, e.target.value)}
                        />
                      </div>
                      <span className="text-sm text-text-secondary">€</span>
                    </div>
                  ))}

                  <div className="flex items-center gap-3 border-2 border-accent/40 p-3">
                    <div className="flex flex-1 items-center gap-2">
                      <StampLabel variant="accent" rotate="left">
                        Fondo
                      </StampLabel>
                      <span className="text-sm text-text-primary font-medium">Reinversión / Fondo</span>
                    </div>
                    <div className="w-36">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={repartos.fondo ?? ''}
                        onChange={(e) => setReparto('fondo', e.target.value)}
                      />
                    </div>
                    <span className="text-sm text-text-secondary">€</span>
                  </div>
                </div>

                <Input
                  label="Concepto del reparto"
                  type="text"
                  value={repartoConcepto}
                  onChange={(e) => setRepartoConcepto(e.target.value)}
                  placeholder="Opcional: se usará el concepto del cobro si lo dejas vacío"
                />

                <div
                  className={`border p-3 ${excedeCobro ? 'border-danger/60 bg-danger-bg' : 'border-accent/40 bg-[#111]'}`}
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  <p className="text-sm text-text-primary">
                    Reparto actual: {totalReparto.toFixed(2)} € · Pendiente sin repartir: {(cantidadCobro - totalReparto).toFixed(2)} €
                  </p>
                  {excedeCobro && (
                    <p className="mt-2 text-xs text-danger" style={{ fontFamily: 'Inter, sans-serif' }}>
                      El reparto no puede superar la cantidad cobrada.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="secondary" onClick={reset} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" isLoading={loading}>
                  Registrar cobro y reparto
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function CobroYRepartoAhora(props: Props) {
  return (
    <ToastProvider>
      <CobroYRepartoAhoraInner {...props} />
    </ToastProvider>
  );
}