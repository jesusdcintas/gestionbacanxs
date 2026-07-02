import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { CATEGORIAS_GASTO } from '../../services/gastos';
import type { Database } from '../../types/database';

type Gasto = Database['public']['Tables']['gastos']['Row'];
type Evento = Database['public']['Tables']['eventos']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type GastoPago = Database['public']['Tables']['gasto_pagos']['Row'];

type GastoConFuentes = Gasto & {
  gasto_pagos?: (GastoPago & { profiles?: { nombre: string } | null })[];
};

interface Props {
  gasto?: GastoConFuentes;
  eventos: Evento[];
  profiles: Profile[];
  defaultEventoId?: string | null;
  mode?: 'general' | 'evento';
}

export default function GastoForm({
  gasto,
  eventos,
  profiles,
  defaultEventoId = null,
  mode = 'general',
}: Props) {
  const modoEvento = mode === 'evento';

  const [formData, setFormData] = useState({
    concepto: gasto?.concepto || '',
    cantidad: gasto?.cantidad?.toString() || '',
    categoria: gasto?.categoria || 'Otros',
    tipo_gasto: gasto?.tipo_gasto || (modoEvento ? 'directo_evento' : 'inversion_empresa'),
    fecha: gasto?.fecha || new Date().toISOString().split('T')[0],
    evento_id: gasto?.evento_id || defaultEventoId || '',
    reembolsado: Boolean(gasto?.reembolsado),
  });

  const [fuentes, setFuentes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const p of profiles) {
      const pago = gasto?.gasto_pagos?.find((gp) => gp.socio_id === p.id);
      initial[`socio_${p.id}`] = pago ? String(Number(pago.cantidad)) : '0';
    }
    const pagoFondo = gasto?.gasto_pagos?.find((gp) => gp.socio_id === null);
    initial.fondo = pagoFondo ? String(Number(pagoFondo.cantidad)) : '0';
    return initial;
  });

  const cantidadGasto = Number(formData.cantidad) || 0;
  const totalFuentes = useMemo(
    () => Object.values(fuentes).reduce((sum, val) => sum + (parseFloat(val) || 0), 0),
    [fuentes],
  );
  const diferencia = cantidadGasto - totalFuentes;
  const cuadra = Math.abs(diferencia) < 0.01;
  const requiereEvento = formData.tipo_gasto === 'directo_evento';
  const eventoValido = !requiereEvento || Boolean(formData.evento_id);
  const puedeEnviar = cuadra && eventoValido;

  const setFuente = (key: string, value: string) => {
    setFuentes((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!puedeEnviar) {
      event.preventDefault();
    }
  };

  return (
    <Card>
      <form method="POST" className="space-y-6" onSubmit={onSubmit}>
        <div>
          <h2 className="text-xl font-semibold mb-4">{gasto ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Concepto"
              type="text"
              name="concepto"
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              required
              placeholder="Ej: Gasolina Madrid-Barcelona"
            />
          </div>

          <div>
            <Input
              label="Cantidad"
              type="number"
              name="cantidad"
              step="0.01"
              min="0"
              value={formData.cantidad}
              onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
              required
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary mb-1.5">
              Categoría
            </label>
            <select
              name="categoria"
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              required
              className="w-full border border-border bg-[#0a0a0a] px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {CATEGORIAS_GASTO.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Input
              label="Fecha"
              type="date"
              name="fecha"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              required
            />
          </div>

          {modoEvento ? (
            <>
              <input type="hidden" name="tipo_gasto" value="directo_evento" />
              <input type="hidden" name="evento_id" value={formData.evento_id} />
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary mb-1.5">
                  Tipo de gasto
                </label>
                <div className="w-full border border-border bg-[#0a0a0a] px-3 py-2 text-sm text-text-primary">
                  Gasto del evento (directo)
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary mb-1.5">
                  Tipo de gasto
                </label>
                <select
                  name="tipo_gasto"
                  value={formData.tipo_gasto}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tipo_gasto: e.target.value as 'directo_evento' | 'inversion_empresa',
                    })
                  }
                  required
                  className="w-full border border-border bg-[#0a0a0a] px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="directo_evento">Gasto del evento</option>
                  <option value="inversion_empresa">Inversión de empresa</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary mb-1.5">
                  {requiereEvento ? 'Evento (obligatorio)' : '¿Relacionado con algún evento? (opcional)'}
                </label>
                <select
                  name="evento_id"
                  value={formData.evento_id}
                  onChange={(e) => setFormData({ ...formData, evento_id: e.target.value })}
                  required={requiereEvento}
                  className="w-full border border-border bg-[#0a0a0a] px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">Sin evento asociado</option>
                  {eventos.map((evento) => (
                    <option key={evento.id} value={evento.id}>
                      {evento.nombre} - {evento.fecha ? new Date(evento.fecha).toLocaleDateString('es-ES') : 'Sin fecha'}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="md:col-span-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="reembolsado"
                checked={formData.reembolsado}
                onChange={(e) => setFormData({ ...formData, reembolsado: e.target.checked })}
                className="h-4 w-4 border-border-strong bg-[#0a0a0a] text-accent accent-accent focus:ring-accent"
              />
              <span className="text-sm text-text-primary">Marcar como reembolsado</span>
            </label>
          </div>
        </div>

        <div className="space-y-4 border border-border bg-[#0a0a0a] p-4">
          <h3 className="text-sm uppercase tracking-[0.08em] text-text-primary">¿Con qué dinero se pagó?</h3>

          <div className="space-y-3">
            {profiles.map((profile) => (
              <div key={profile.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-text-primary">{profile.nombre}</span>
                <div className="w-40">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    name={`fuente_${profile.id}`}
                    value={fuentes[`socio_${profile.id}`] || '0'}
                    onChange={(e) => setFuente(`socio_${profile.id}`, e.target.value)}
                  />
                </div>
                <span className="text-sm text-text-secondary">€</span>
              </div>
            ))}

            <div className="flex items-center gap-3 border-t border-border pt-3">
              <span className="flex-1 text-sm text-text-primary">Fondo de empresa</span>
              <div className="w-40">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  name="fuente_fondo"
                  value={fuentes.fondo || '0'}
                  onChange={(e) => setFuente('fondo', e.target.value)}
                />
              </div>
              <span className="text-sm text-text-secondary">€</span>
            </div>
          </div>

          <div
            className={`border p-3 ${cuadra ? 'border-accent/40 bg-[#111]' : 'border-danger/60 bg-danger-bg'}`}
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            <p className="text-sm text-text-primary">
              Gasto: {cantidadGasto.toFixed(2)} € · Fuentes: {totalFuentes.toFixed(2)} € · Diferencia: {diferencia.toFixed(2)} €
            </p>
            {!cuadra && (
              <p className="mt-2 text-xs text-danger" style={{ fontFamily: 'Inter, sans-serif' }}>
                La suma de fuentes debe coincidir exactamente con la cantidad del gasto.
              </p>
            )}
            {!eventoValido && (
              <p className="mt-2 text-xs text-danger" style={{ fontFamily: 'Inter, sans-serif' }}>
                Para un gasto del evento debes seleccionar un evento.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" variant="primary" disabled={!puedeEnviar}>
            {gasto ? 'Actualizar' : 'Crear Gasto'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => (window.location.href = '/gastos')}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
