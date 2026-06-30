import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { CATEGORIAS_GASTO } from '../../services/gastos';
import type { Database } from '../../types/database';

type Gasto = Database['public']['Tables']['gastos']['Row'];
type Evento = Database['public']['Tables']['eventos']['Row'];

interface Props {
  gasto?: Gasto;
  eventos: Evento[];
}

export default function GastoForm({ gasto, eventos }: Props) {
  const [formData, setFormData] = useState({
    concepto: gasto?.concepto || '',
    cantidad: gasto?.cantidad?.toString() || '',
    categoria: gasto?.categoria || 'Otros',
    fecha: gasto?.fecha || new Date().toISOString().split('T')[0],
    evento_id: gasto?.evento_id || '',
  });

  return (
    <Card>
      <form method="POST" className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {gasto ? 'Editar Gasto' : 'Nuevo Gasto'}
          </h2>
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
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary mb-1.5">Categoría</label>
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

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary mb-1.5">
              Evento (opcional)
            </label>
            <select
              name="evento_id"
              value={formData.evento_id}
              onChange={(e) => setFormData({ ...formData, evento_id: e.target.value })}
              className="w-full border border-border bg-[#0a0a0a] px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Sin evento asociado</option>
              {eventos.map((evento) => (
                <option key={evento.id} value={evento.id}>
                  {evento.nombre} - {new Date(evento.fecha).toLocaleDateString('es-ES')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" variant="primary">
            {gasto ? 'Actualizar' : 'Crear Gasto'}
          </Button>
          <Button type="button" variant="secondary" onclick="window.location.href='/gastos'">
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
