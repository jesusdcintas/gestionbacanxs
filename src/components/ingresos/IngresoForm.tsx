import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import type { Database } from '../../types/database';

type Ingreso = Database['public']['Tables']['pagos_evento']['Row'];
type Evento = Database['public']['Tables']['eventos']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface Props {
  ingreso?: Ingreso;
  eventos: Evento[];
  profiles: Profile[];
}

export default function IngresoForm({ ingreso, eventos, profiles }: Props) {
  const eventoInicial = ingreso?.evento_id || eventos[0]?.id || '';

  const [formData, setFormData] = useState({
    concepto: ingreso?.concepto || '',
    cantidad: ingreso?.cantidad?.toString() || '',
    fecha: ingreso?.fecha || new Date().toISOString().split('T')[0],
    evento_id: eventoInicial,
    recibido_por: ingreso?.recibido_por || '',
    metodo_pago: ingreso?.metodo_pago || 'banco',
  });

  const sinEventos = eventos.length === 0;
  const sinProfiles = profiles.length === 0;

  return (
    <Card>
      <form method="POST" className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {ingreso ? 'Editar Ingreso' : 'Nuevo Ingreso'}
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
              placeholder="Ej: Pago concierto"
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
            <Select
              label="¿Quién cobró?"
              name="recibido_por"
              value={formData.recibido_por}
              onChange={(e) => setFormData({ ...formData, recibido_por: e.target.value })}
              required
              disabled={sinProfiles}
            >
              <option value="">Selecciona quién cobró</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.nombre}
                </option>
              ))}
            </Select>
            {sinProfiles && (
              <p className="mt-2 text-xs text-text-secondary">
                Crea perfiles antes de registrar ingresos.
              </p>
            )}
          </div>

          <div>
            <Select
              label="Forma de cobro"
              name="metodo_pago"
              value={formData.metodo_pago}
              onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
            >
              <option value="banco">Banco</option>
              <option value="efectivo">Efectivo</option>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Select
              label="Evento"
              name="evento_id"
              value={formData.evento_id}
              onChange={(e) => setFormData({ ...formData, evento_id: e.target.value })}
              required
              disabled={sinEventos}
            >
              {sinEventos && <option value="">No hay eventos disponibles</option>}
              {eventos.map((evento) => (
                <option key={evento.id} value={evento.id}>
                  {evento.nombre} - {new Date(evento.fecha).toLocaleDateString('es-ES')}
                </option>
              ))}
            </Select>
            {sinEventos && (
              <p className="mt-2 text-xs text-text-secondary">
                Crea un evento antes de registrar ingresos.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" variant="primary">
            {ingreso ? 'Actualizar' : 'Crear Ingreso'}
          </Button>
          <Button type="button" variant="secondary" onclick="window.location.href='/ingresos'">
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
