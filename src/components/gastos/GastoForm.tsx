import { useEffect, useMemo, useState } from 'react';
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
    forma_pago: gasto?.forma_pago || '',
    tipo_factura: gasto?.tipo_factura || '',
    reembolsado: Boolean(gasto?.reembolsado),
  });

  const buildFuentesFromGasto = () => {
    const initial: Record<string, string> = {};
    for (const p of profiles) {
      const pago = gasto?.gasto_pagos?.find((gp) => gp.socio_id === p.id);
      initial[`socio_${p.id}`] = pago ? String(Number(pago.cantidad)) : '0';
    }
    const pagoFondo = gasto?.gasto_pagos?.find((gp) => gp.socio_id === null);
    initial.fondo = pagoFondo ? String(Number(pagoFondo.cantidad)) : '0';
    return initial;
  };

  const [fuentes, setFuentes] = useState<Record<string, string>>(() => buildFuentesFromGasto());
  const [facturaPreviewUrl, setFacturaPreviewUrl] = useState<string | null>(null);
  const [facturaPreviewError, setFacturaPreviewError] = useState<string | null>(null);
  const [facturaLoading, setFacturaLoading] = useState(false);

  useEffect(() => {
    setFormData({
      concepto: gasto?.concepto || '',
      cantidad: gasto?.cantidad?.toString() || '',
      categoria: gasto?.categoria || 'Otros',
      tipo_gasto: gasto?.tipo_gasto || (modoEvento ? 'directo_evento' : 'inversion_empresa'),
      fecha: gasto?.fecha || new Date().toISOString().split('T')[0],
      evento_id: gasto?.evento_id || defaultEventoId || '',
      forma_pago: gasto?.forma_pago || '',
      tipo_factura: gasto?.tipo_factura || '',
      reembolsado: Boolean(gasto?.reembolsado),
    });
    setFuentes(buildFuentesFromGasto());
    setFacturaPreviewUrl(null);
    setFacturaPreviewError(null);
    setFacturaLoading(false);
  }, [gasto, defaultEventoId, modoEvento, profiles]);

  const cargarFacturaActual = async () => {
    if (!gasto?.id || !gasto.factura_path) return;

    setFacturaLoading(true);
    setFacturaPreviewError(null);

    try {
      const response = await fetch(`/api/gastos/${gasto.id}/factura-url`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo cargar la factura');
      }

      const payload = await response.json();
      if (!payload?.url) {
        throw new Error('No se recibió URL temporal para la factura');
      }

      setFacturaPreviewUrl(payload.url);
    } catch (error) {
      setFacturaPreviewError(error instanceof Error ? error.message : 'No se pudo cargar la factura');
    } finally {
      setFacturaLoading(false);
    }
  };

  const esFacturaPdf = Boolean(gasto?.factura_path?.toLowerCase().endsWith('.pdf'));

  const cantidadGasto = Number(formData.cantidad) || 0;
  const totalFuentes = useMemo(
    () => Object.values(fuentes).reduce((sum, val) => sum + (parseFloat(val) || 0), 0),
    [fuentes],
  );
  const diferencia = cantidadGasto - totalFuentes;
  const cuadra = Math.abs(diferencia) < 0.01;
  const requiereEvento = formData.tipo_gasto === 'directo_evento';
  const requiereFuentesExactas = formData.tipo_gasto !== 'directo_evento';
  const eventoValido = !requiereEvento || Boolean(formData.evento_id);
  const puedeEnviar = eventoValido && (!requiereFuentesExactas || (totalFuentes > 0 && cuadra));
  const mostrarAvisoFuentes = requiereFuentesExactas && !cuadra;

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
      <form method="POST" encType="multipart/form-data" className="space-y-6" onSubmit={onSubmit}>
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

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary mb-1.5">
              Forma de pago (opcional)
            </label>
            <select
              name="forma_pago"
              value={formData.forma_pago}
              onChange={(e) => setFormData({ ...formData, forma_pago: e.target.value })}
              className="w-full border border-border bg-[#0a0a0a] px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Sin especificar</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary mb-1.5">
              ¿TIENE FACTURA? (OPCIONAL)
            </label>
            <input type="hidden" name="tipo_factura" value={formData.tipo_factura} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipo_factura: '' })}
                className={`border px-3 py-2 text-left transition-colors ${
                  formData.tipo_factura === ''
                    ? 'border-accent bg-accent/10 text-text-primary'
                    : 'border-border bg-[#0a0a0a] text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="block text-sm font-semibold">Sin especificar</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipo_factura: 'A' })}
                className={`border px-3 py-2 text-left transition-colors ${
                  formData.tipo_factura === 'A'
                    ? 'border-accent bg-accent/10 text-text-primary'
                    : 'border-border bg-[#0a0a0a] text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="block text-sm font-semibold">Con factura</span>
                <span className="block text-[11px] uppercase tracking-[0.08em] text-text-secondary">(A)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipo_factura: 'B' })}
                className={`border px-3 py-2 text-left transition-colors ${
                  formData.tipo_factura === 'B'
                    ? 'border-accent bg-accent/10 text-text-primary'
                    : 'border-border bg-[#0a0a0a] text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="block text-sm font-semibold">Sin factura / ticket</span>
                <span className="block text-[11px] uppercase tracking-[0.08em] text-text-secondary">(B)</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary mb-1.5">
              Factura (PDF o imagen, máx. 10MB)
            </label>
            <input
              type="file"
              name="factura"
              accept="application/pdf,image/jpeg,image/png"
              className="w-full border border-border bg-[#0a0a0a] px-3 py-2 text-sm text-text-primary file:mr-3 file:border-0 file:bg-accent file:px-3 file:py-1 file:text-xs file:font-semibold file:text-accent-ink"
            />
            {gasto?.factura_path && (
              <div className="mt-3 space-y-3 border border-border bg-[#0a0a0a] p-3">
                <p className="text-xs text-text-secondary">Ya hay una factura adjunta. Si subes otra, reemplazará la actual.</p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      void cargarFacturaActual();
                    }}
                    isLoading={facturaLoading}
                  >
                    Ver factura actual
                  </Button>

                  {facturaPreviewUrl && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(facturaPreviewUrl, '_blank', 'noopener,noreferrer')}
                    >
                      Abrir en pestaña nueva
                    </Button>
                  )}
                </div>

                {facturaPreviewError && <p className="text-xs text-danger">{facturaPreviewError}</p>}

                {facturaPreviewUrl && (
                  <div className="border border-border bg-black/30 p-2">
                    {esFacturaPdf ? (
                      <iframe
                        title="Previsualización de factura"
                        src={facturaPreviewUrl}
                        className="h-105 w-full"
                      />
                    ) : (
                      <img src={facturaPreviewUrl} alt="Factura adjunta" className="max-h-130 w-full object-contain" />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

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
              <div key={profile.id} className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                <span className="min-w-0 flex-1 text-sm text-text-primary">{profile.nombre}</span>
                <div className="w-full sm:w-40">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    name={`fuente_${profile.id}`}
                    value={fuentes[`socio_${profile.id}`] ?? ''}
                    onChange={(e) => setFuente(`socio_${profile.id}`, e.target.value)}
                  />
                </div>
                <span className="text-sm text-text-secondary">€</span>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3 sm:flex-nowrap">
              <span className="min-w-0 flex-1 text-sm text-text-primary">Fondo de empresa</span>
              <div className="w-full sm:w-40">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  name="fuente_fondo"
                  value={fuentes.fondo ?? ''}
                  onChange={(e) => setFuente('fondo', e.target.value)}
                />
              </div>
              <span className="text-sm text-text-secondary">€</span>
            </div>
          </div>

          <div
            className={`border p-3 ${mostrarAvisoFuentes ? 'border-danger/60 bg-danger-bg' : 'border-accent/40 bg-[#111]'}`}
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            <p className="text-sm text-text-primary">
              Gasto: {cantidadGasto.toFixed(2)} € · Fuentes: {totalFuentes.toFixed(2)} € · Diferencia: {diferencia.toFixed(2)} €
            </p>
            {mostrarAvisoFuentes ? (
              <p className="mt-2 text-xs text-danger" style={{ fontFamily: 'Inter, sans-serif' }}>
                La suma de fuentes debe coincidir exactamente con la cantidad del gasto.
              </p>
            ) : requiereFuentesExactas ? (
              <p className="mt-2 text-xs text-text-secondary" style={{ fontFamily: 'Inter, sans-serif' }}>
                En una inversión debes repartir el 100% entre socios y/o fondo.
              </p>
            ) : totalFuentes === 0 ? (
              <p className="mt-2 text-xs text-text-secondary" style={{ fontFamily: 'Inter, sans-serif' }}>
                Si salió directamente del cobro del evento, puedes dejar las fuentes a 0.
              </p>
            ) : (
              <p className="mt-2 text-xs text-text-secondary" style={{ fontFamily: 'Inter, sans-serif' }}>
                Puedes registrar pagos parciales o completos desde socios/fondo.
              </p>
            )}
            {!eventoValido && (
              <p className="mt-2 text-xs text-danger" style={{ fontFamily: 'Inter, sans-serif' }}>
                Para un gasto del evento debes seleccionar un evento.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <Button type="submit" variant="primary" disabled={!puedeEnviar} className="w-full sm:w-auto">
            {gasto ? 'Actualizar' : 'Crear Gasto'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => (window.location.href = '/gastos')} className="w-full sm:w-auto">
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
