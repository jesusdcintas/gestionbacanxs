import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { StampLabel } from '../ui/StampLabel';
import type { Database } from '../../types/database';

type Evento = Database['public']['Tables']['eventos']['Row'];

interface Props {
  evento?: Evento;
}

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
] as const;

export default function EventoForm({ evento }: Props) {
  const [formData, setFormData] = useState({
    nombre: evento?.nombre || '',
    fecha: evento?.fecha || new Date().toISOString().split('T')[0],
    lugar: evento?.lugar || '',
    cliente: evento?.cliente || '',
    presupuesto: evento?.presupuesto?.toString() || '',
    con_factura: evento?.con_factura || false,
    retencion_irpf: evento?.retencion_irpf?.toString() || '20.00',
    estado: evento?.estado || 'pendiente',
    observaciones: evento?.observaciones || '',
  });

  // Calcular ingreso neto (presupuesto - retención IRPF)
  const presupuestoNum = parseFloat(formData.presupuesto) || 0;
  const retencionNum = parseFloat(formData.retencion_irpf) || 0;
  const retencionCantidad = formData.con_factura ? (presupuestoNum * retencionNum) / 100 : 0;
  const ingresoNeto = presupuestoNum - retencionCantidad;

  return (
    <Card>
      <form method="POST" className="space-y-8">
        <div>
          <h2
            className="text-2xl uppercase italic"
            style={{ fontFamily: '"Archivo Black", sans-serif' }}
          >
            {evento ? 'Editar evento' : 'Nuevo evento'}
          </h2>
        </div>

        {/* Información básica */}
        <div className="space-y-4">
          <StampLabel rotate="left">Información básica</StampLabel>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary mb-1.5">
                Estado
              </label>
              <select
                name="estado"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-border text-text-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              >
                {ESTADOS.map(estado => (
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
              <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary mb-1.5">
                Observaciones
              </label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={3}
                placeholder="Notas adicionales sobre el evento..."
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-border text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Información financiera */}
        <div className="space-y-4">
          <StampLabel rotate="right">Información financiera</StampLabel>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="flex items-center gap-2 cursor-pointer pt-7">
                <input
                  type="checkbox"
                  name="con_factura"
                  value="true"
                  checked={formData.con_factura}
                  onChange={(e) => setFormData({ ...formData, con_factura: e.target.checked })}
                  className="w-4 h-4 border-border-strong bg-[#0a0a0a] text-accent accent-accent focus:ring-accent focus:ring-offset-[#0a0a0a]"
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

          {/* Cálculos en vivo */}
          {presupuestoNum > 0 && (
            <div
              className="bg-[#0a0a0a] border border-border p-4 space-y-2"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary uppercase tracking-[0.08em] text-[11px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Presupuesto
                </span>
                <span className="text-text-primary">{presupuestoNum.toFixed(2)} €</span>
              </div>
              {formData.con_factura && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary uppercase tracking-[0.08em] text-[11px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Retención IRPF ({retencionNum}%)
                  </span>
                  <span className="text-danger">−{retencionCantidad.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-border pt-2">
                <span className="text-text-primary uppercase tracking-[0.08em] text-[11px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Ingreso neto
                </span>
                <span className="text-accent">{ingresoNeto.toFixed(2)} €</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" variant="primary">
            {evento ? 'Actualizar' : 'Crear Evento'}
          </Button>
          <Button type="button" variant="secondary" onclick="window.location.href='/eventos'">
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
