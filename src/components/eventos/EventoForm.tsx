import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { StampLabel } from '../ui/StampLabel';
import type { Database } from '../../types/database';
import {
  getEstadoFinancieroLabel,
  getEstadoStamp,
  getEstadoVisible,
  getEstadoVisibleLabel,
  type EstadoFinanciero,
  type EstadoTrabajo,
} from '../../utils/eventoEstado';
import { calcularNetoRepartibleEvento, calcularRetencionIRPF } from '../../utils/finanzas';

type Evento = Database['public']['Tables']['eventos']['Row'];

interface Socio {
  id: string;
  nombre: string;
}

interface RepartoInicial {
  socio_id: string | null;
  cantidad: number;
}

interface Props {
  evento?: Evento;
  eventoId?: string;
  totalGastosEvento?: number;
  socios?: Socio[];
  repartosIniciales?: RepartoInicial[];
}

const ESTADOS_FINANCIEROS: Array<{ value: EstadoFinanciero; label: string }> = [
  { value: 'no_pagado', label: 'No pagado' },
  { value: 'parcialmente_pagado', label: 'Parcialmente pagado' },
  { value: 'pagado', label: 'Pagado' },
];

const ESTADOS_TRABAJO: Array<{ value: EstadoTrabajo; label: string }> = [
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'realizado', label: 'Realizado' },
  { value: 'cancelado', label: 'Cancelado' },
];

export default function EventoForm({
  evento,
  eventoId,
  totalGastosEvento = 0,
  socios = [],
  repartosIniciales = [],
}: Props) {
  const [formData, setFormData] = useState({
    nombre: evento?.nombre || '',
    fecha: evento?.fecha || new Date().toISOString().split('T')[0],
    lugar: evento?.lugar || '',
    cliente: evento?.cliente || '',
    presupuesto: evento?.presupuesto?.toString() || '',
    con_factura: evento?.con_factura || false,
    retencion_irpf: evento?.retencion_irpf?.toString() || '20.00',
    estado_financiero: evento?.estado_financiero || 'no_pagado',
    estado_trabajo: evento?.estado_trabajo || 'confirmado',
    observaciones: evento?.observaciones || '',
  });

  const [repartos, setRepartos] = useState<Record<string, string>>({});

  useEffect(() => {
    const inicial: Record<string, string> = {};
    socios.forEach((socio) => {
      const r = repartosIniciales.find((item) => item.socio_id === socio.id);
      inicial[socio.id] = r ? String(r.cantidad) : '0';
    });
    const fondo = repartosIniciales.find((item) => item.socio_id === null);
    inicial.fondo = fondo ? String(fondo.cantidad) : '0';
    setRepartos(inicial);
  }, [socios, repartosIniciales]);

  const estadoVisible = useMemo(
    () => getEstadoVisible(formData.estado_trabajo, formData.estado_financiero),
    [formData.estado_trabajo, formData.estado_financiero],
  );

  const stamp = getEstadoStamp(estadoVisible);

  const presupuestoBruto = parseFloat(formData.presupuesto) || 0;
  const retencionPct = parseFloat(formData.retencion_irpf) || 0;
  const retencionImporte = calcularRetencionIRPF(
    presupuestoBruto,
    formData.con_factura,
    retencionPct,
  );

  const netoRepartible = calcularNetoRepartibleEvento(
    presupuestoBruto,
    formData.con_factura,
    retencionPct,
    totalGastosEvento,
  );

  const totalRepartido = Object.values(repartos).reduce((sum, value) => {
    return sum + (parseFloat(value) || 0);
  }, 0);

  const sinRepartir = netoRepartible - totalRepartido;
  const repartoSePasa = totalRepartido > netoRepartible + 0.01;

  const setReparto = (key: string, value: string) => {
    setRepartos((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <form method="POST" className="space-y-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl uppercase italic" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
            {evento ? 'Editar evento' : 'Nuevo evento'}
          </h2>
          <StampLabel variant={stamp.variant} rotate={stamp.rotate}>
            {getEstadoVisibleLabel(estadoVisible)}
          </StampLabel>
        </div>

        <div className="space-y-4">
          <StampLabel rotate="left">Información básica</StampLabel>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Nombre del evento"
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                placeholder="Ej: Concierto en Sala X"
              />
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

            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                Estado del trabajo
              </label>
              <select
                name="estado_trabajo"
                value={formData.estado_trabajo}
                onChange={(e) => setFormData({ ...formData, estado_trabajo: e.target.value as EstadoTrabajo })}
                className="w-full border border-border bg-[#0a0a0a] px-3 py-2 text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {ESTADOS_TRABAJO.map((estado) => (
                  <option key={estado.value} value={estado.value}>
                    {estado.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Input
                label="Lugar"
                type="text"
                name="lugar"
                value={formData.lugar}
                onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
                placeholder="Ej: Sala Caracol"
              />
            </div>

            <div>
              <Input
                label="Cliente"
                type="text"
                name="cliente"
                value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                placeholder="Ej: Ayuntamiento de Madrid"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                Observaciones
              </label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={3}
                placeholder="Notas adicionales sobre el evento..."
                className="w-full border border-border bg-[#0a0a0a] px-3 py-2 text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <StampLabel rotate="right">Información financiera</StampLabel>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Input
                label="Presupuesto"
                type="number"
                name="presupuesto"
                step="0.01"
                min="0"
                value={formData.presupuesto}
                onChange={(e) => setFormData({ ...formData, presupuesto: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                Estado financiero
              </label>
              <select
                name="estado_financiero"
                value={formData.estado_financiero}
                onChange={(e) => setFormData({ ...formData, estado_financiero: e.target.value as EstadoFinanciero })}
                className="w-full border border-border bg-[#0a0a0a] px-3 py-2 text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {ESTADOS_FINANCIEROS.map((estado) => (
                  <option key={estado.value} value={estado.value}>
                    {estado.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  name="con_factura"
                  value="true"
                  checked={formData.con_factura}
                  onChange={(e) => setFormData({ ...formData, con_factura: e.target.checked })}
                  className="h-4 w-4 border-border-strong bg-[#0a0a0a] text-accent accent-accent focus:ring-accent focus:ring-offset-[#0a0a0a]"
                />
                <span className="text-sm text-text-primary">Con factura (aplicar retención IRPF)</span>
              </label>
            </div>

            {formData.con_factura && (
              <div>
                <Input
                  label="Retención IRPF (%)"
                  type="number"
                  name="retencion_irpf"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.retencion_irpf}
                  onChange={(e) => setFormData({ ...formData, retencion_irpf: e.target.value })}
                  placeholder="20.00"
                />
              </div>
            )}
          </div>

          <div className="space-y-2 border border-border bg-[#0a0a0a] p-4" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            <div className="flex justify-between text-sm">
              <span className="text-[11px] uppercase tracking-[0.08em] text-text-secondary" style={{ fontFamily: 'Inter, sans-serif' }}>
                Presupuesto bruto
              </span>
              <span className="text-text-primary">{presupuestoBruto.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[11px] uppercase tracking-[0.08em] text-text-secondary" style={{ fontFamily: 'Inter, sans-serif' }}>
                (−) Retención IRPF
              </span>
              <span className={formData.con_factura ? 'text-danger' : 'text-text-secondary'}>
                −{retencionImporte.toFixed(2)} €
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[11px] uppercase tracking-[0.08em] text-text-secondary" style={{ fontFamily: 'Inter, sans-serif' }}>
                (−) Total gastos del evento
              </span>
              <span className="text-danger">−{totalGastosEvento.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span className="text-[11px] uppercase tracking-[0.08em] text-text-primary" style={{ fontFamily: 'Inter, sans-serif' }}>
                (=) Neto repartible
              </span>
              <span className={netoRepartible >= 0 ? 'text-accent' : 'text-danger'}>{netoRepartible.toFixed(2)} €</span>
            </div>
            <p className="text-xs text-text-secondary" style={{ fontFamily: 'Inter, sans-serif' }}>
              Estado financiero actual: {getEstadoFinancieroLabel(formData.estado_financiero)}
            </p>
          </div>
        </div>

        {eventoId && (
          <div className="space-y-4">
            <StampLabel rotate="left">Reparto de ganancias</StampLabel>

            <div className="space-y-3">
              {socios.map((socio) => (
                <div key={socio.id} className="flex items-center gap-3 border border-border bg-[#0a0a0a] p-3">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-text-primary">{socio.nombre}</span>
                  </div>
                  <div className="w-36">
                    <Input
                      type="number"
                      name={`reparto_${socio.id}`}
                      step="0.01"
                      min="0"
                      value={repartos[socio.id] || '0'}
                      onChange={(e) => setReparto(socio.id, e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <span className="w-8 text-sm text-text-secondary">€</span>
                </div>
              ))}

              <div className="flex items-center gap-3 border-2 border-accent/40 bg-[#0a0a0a] p-3">
                <div className="flex flex-1 items-center gap-2">
                  <StampLabel variant="accent" rotate="left">Fondo</StampLabel>
                  <span className="text-sm font-medium text-text-primary">Fondo de empresa</span>
                </div>
                <div className="w-36">
                  <Input
                    type="number"
                    name="reparto_fondo"
                    step="0.01"
                    min="0"
                    value={repartos.fondo || '0'}
                    onChange={(e) => setReparto('fondo', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <span className="w-8 text-sm text-text-secondary">€</span>
              </div>
            </div>

            <div className={`border p-4 ${repartoSePasa ? 'border-danger/60 bg-danger-bg' : 'border-accent/40 bg-[#0a0a0a]'}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              <p className="text-sm text-text-primary">
                Neto repartible: {netoRepartible.toFixed(2)}€ — Repartido: {totalRepartido.toFixed(2)}€ — Sin repartir: {sinRepartir.toFixed(2)}€
              </p>
              {repartoSePasa && (
                <p className="mt-2 text-xs text-danger" style={{ fontFamily: 'Inter, sans-serif' }}>
                  El reparto supera el neto repartible. Ajusta importes para poder guardar.
                </p>
              )}
              {!repartoSePasa && sinRepartir > 0.01 && (
                <p className="mt-2 text-xs text-text-secondary" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Reparto parcial permitido: quedará parte del neto sin asignar.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" variant="primary" disabled={repartoSePasa}>
            Guardar cambios
          </Button>
          <Button type="button" variant="secondary" onClick={() => (window.location.href = '/eventos')}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
