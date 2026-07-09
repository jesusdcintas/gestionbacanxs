import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { StampLabel } from '../ui/StampLabel';
import ConfirmDialog from '../ui/ConfirmDialog';

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
  const ordenarRepartos = (items: RepartoHistorico[]) =>
    [...items].sort((a, b) => {
      const fechaDiff = new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      if (fechaDiff !== 0) return fechaDiff;

      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (createdB !== createdA) return createdB - createdA;

      return b.id.localeCompare(a.id);
    });

  const [repartosHistoricos, setRepartosHistoricos] = useState<RepartoHistorico[]>(() =>
    ordenarRepartos(repartosIniciales),
  );
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingRepartoId, setEditingRepartoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fecha: '', concepto: '', cantidad: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingDeleteId, setSavingDeleteId] = useState<string | null>(null);
  const [repartoAEliminar, setRepartoAEliminar] = useState<RepartoHistorico | null>(null);

  useEffect(() => {
    setRepartosHistoricos(ordenarRepartos(repartosIniciales));
  }, [repartosIniciales]);

  const yaRepartido = useMemo(
    () => repartosHistoricos.reduce((sum, r) => sum + Number(r.cantidad), 0),
    [repartosHistoricos],
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

  const startEdit = (item: RepartoHistorico) => {
    setEditingRepartoId(item.id);
    setEditForm({
      fecha: item.fecha,
      concepto: item.concepto || '',
      cantidad: String(item.cantidad),
    });
    setErrorMessage(null);
  };

  const cancelEdit = () => {
    setEditingRepartoId(null);
    setEditForm({ fecha: '', concepto: '', cantidad: '' });
    setSavingEdit(false);
  };

  const saveEdit = async () => {
    if (!editingRepartoId) return;

    const cantidad = parseFloat(editForm.cantidad.replace(',', '.'));
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setErrorMessage('La cantidad debe ser mayor que 0.');
      return;
    }

    setSavingEdit(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/repartos/${eventoId}/${editingRepartoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: editForm.fecha,
          concepto: editForm.concepto.trim() || null,
          cantidad,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo editar el reparto');
      }

      setRepartosHistoricos((prev) =>
        ordenarRepartos(
          prev.map((item) =>
            item.id === editingRepartoId
              ? {
                  ...item,
                  fecha: editForm.fecha,
                  concepto: editForm.concepto.trim() || null,
                  cantidad,
                }
              : item,
          ),
        ),
      );
      cancelEdit();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al editar el reparto';
      setErrorMessage(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const pedirEliminarReparto = (item: RepartoHistorico) => {
    if (savingDeleteId) return;
    setRepartoAEliminar(item);
  };

  const confirmarEliminarReparto = async () => {
    if (!repartoAEliminar) return;

    setSavingDeleteId(repartoAEliminar.id);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/repartos/${eventoId}/${repartoAEliminar.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo eliminar el reparto');
      }

      setRepartosHistoricos((prev) => prev.filter((current) => current.id !== repartoAEliminar.id));
      if (editingRepartoId === repartoAEliminar.id) {
        cancelEdit();
      }
      setRepartoAEliminar(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al eliminar el reparto';
      setErrorMessage(msg);
    } finally {
      setSavingDeleteId(null);
    }
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
      setErrorMessage('No hay saldo pendiente para repartir.');
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
      setErrorMessage('La tanda supera lo pendiente por repartir o está vacía.');
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
      setErrorMessage(null);
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
      setErrorMessage(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card>
      <div className="space-y-5">
        {errorMessage ? (
          <div className="border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">{errorMessage}</div>
        ) : null}

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
          {pendiente < 0 ? (
            <p className="text-xs text-danger" style={{ fontFamily: 'Inter, sans-serif' }}>
              El total repartido supera el neto disponible.
            </p>
          ) : null}
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
              <div key={socio.id} className="flex flex-wrap items-center gap-3 border border-border p-3 sm:flex-nowrap">
                <span className="min-w-0 flex-1 text-sm text-text-primary font-medium">{socio.nombre}</span>
                <div className="w-full sm:w-36">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={asignaciones[socio.id] ?? ''}
                    onChange={(e) => setAsignacion(socio.id, e.target.value)}
                  />
                </div>
                <span className="text-sm text-text-secondary">€</span>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-3 border-2 border-accent/40 p-3 sm:flex-nowrap">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <StampLabel variant="accent" rotate="left">Fondo</StampLabel>
                <span className="text-sm text-text-primary font-medium">Reinversión / Fondo</span>
              </div>
              <div className="w-full sm:w-36">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={asignaciones.fondo ?? ''}
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
          {repartosHistoricos.length === 0 ? (
            <p className="text-sm text-text-secondary">Aún no hay repartos registrados en este evento.</p>
          ) : (
            <div className="space-y-2">
              {repartosHistoricos.map((item) => {
                const estaEditando = editingRepartoId === item.id;

                return (
                  <div key={item.id} className="border border-border p-3 bg-[#0a0a0a] space-y-3">
                    {!estaEditando ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-text-primary font-medium">{item.nombre}</p>
                          <p className="text-xs text-text-secondary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                            {item.fecha}{item.concepto ? ` · ${item.concepto}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <p className="text-sm text-accent font-semibold" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                            {Number(item.cantidad).toFixed(2)} €
                          </p>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => startEdit(item)}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => pedirEliminarReparto(item)}
                            disabled={savingDeleteId === item.id}
                          >
                            {savingDeleteId === item.id ? 'Eliminando...' : 'Eliminar reparto'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <Input
                            label="Fecha"
                            type="date"
                            value={editForm.fecha}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, fecha: e.target.value }))}
                          />
                          <Input
                            label="Concepto"
                            type="text"
                            value={editForm.concepto}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, concepto: e.target.value }))}
                            placeholder="Concepto"
                          />
                          <Input
                            label="Cantidad"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editForm.cantidad}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, cantidad: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button type="button" variant="secondary" size="sm" onClick={cancelEdit} disabled={savingEdit}>
                            Cancelar
                          </Button>
                          <Button type="button" variant="primary" size="sm" onClick={saveEdit} isLoading={savingEdit}>
                            Guardar cambios
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(repartoAEliminar)}
        title="Eliminar reparto"
        description={
          repartoAEliminar
            ? `Vas a eliminar el reparto de ${repartoAEliminar.nombre} (${Number(repartoAEliminar.cantidad).toFixed(2)} €) del histórico.`
            : 'Vas a eliminar este reparto del histórico.'
        }
        confirmLabel="Eliminar reparto"
        destructive
        isLoading={Boolean(repartoAEliminar && savingDeleteId === repartoAEliminar.id)}
        onClose={() => {
          if (!savingDeleteId) setRepartoAEliminar(null);
        }}
        onConfirm={confirmarEliminarReparto}
      />
    </Card>
  );
}
