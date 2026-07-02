import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { StampLabel } from '../ui/StampLabel';
import ConfirmDialog from '../ui/ConfirmDialog';

interface Pago {
  id: string;
  fecha: string;
  cantidad: number;
  concepto: string | null;
}

interface Props {
  eventoId: string;
  pagos: Pago[];
}

export default function PagosEventoSection({ eventoId, pagos: pagosIniciales }: Props) {
  const [pagos, setPagos] = useState(pagosIniciales);
  const [showForm, setShowForm] = useState(false);
  const [editingPago, setEditingPago] = useState<Pago | null>(null);
  const [deletingPagoId, setDeletingPagoId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    cantidad: '',
    concepto: '',
  });

  const totalPagado = pagos.reduce((sum, p) => sum + Number(p.cantidad), 0);

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      cantidad: '',
      concepto: '',
    });
    setEditingPago(null);
    setShowForm(false);
  };

  const handleEdit = (pago: Pago) => {
    setFormData({
      fecha: pago.fecha,
      cantidad: pago.cantidad.toString(),
      concepto: pago.concepto || '',
    });
    setEditingPago(pago);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deletingPagoId) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/pagos/${deletingPagoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Error al eliminar pago');

      setPagos(pagos.filter(p => p.id !== deletingPagoId));
      setDeletingPagoId(null);
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('No se pudo eliminar el pago. Inténtalo de nuevo.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pagoData = {
      evento_id: eventoId,
      fecha: formData.fecha,
      cantidad: parseFloat(formData.cantidad),
      concepto: formData.concepto || null,
    };

    try {
      setErrorMessage(null);
      if (editingPago) {
        // Actualizar
        const response = await fetch(`/api/pagos/${editingPago.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pagoData),
        });

        if (!response.ok) throw new Error('Error al actualizar pago');

        const updated = await response.json();
        setPagos(pagos.map(p => p.id === editingPago.id ? updated : p));
      } else {
        // Crear
        const response = await fetch('/api/pagos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pagoData),
        });

        if (!response.ok) throw new Error('Error al crear pago');

        const nuevo = await response.json();
        setPagos([...pagos, nuevo]);
      }

      resetForm();
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(editingPago ? 'No se pudo actualizar el pago.' : 'No se pudo crear el pago.');
    }
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <StampLabel rotate="left">Pagos recibidos</StampLabel>
            <p className="mt-2 text-sm text-text-secondary">
              Total pagado:{' '}
              <span
                className="font-semibold text-accent"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {totalPagado.toFixed(2)} €
              </span>
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancelar' : '+ Añadir pago'}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="border border-border p-4 space-y-4 bg-[#0a0a0a]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                required
              />
              <Input
                label="Cantidad"
                type="number"
                step="0.01"
                min="0"
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                required
                placeholder="0.00"
              />
              <Input
                label="Concepto"
                type="text"
                value={formData.concepto}
                onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                placeholder="Ej: Primer pago"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="sm">
                {editingPago ? 'Actualizar' : 'Guardar'}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {errorMessage ? (
          <div className="border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">{errorMessage}</div>
        ) : null}

        {pagos.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8">
            No hay pagos registrados para este evento
          </p>
        ) : (
          <div className="space-y-2">
            {pagos.map((pago) => (
              <div
                key={pago.id}
                className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-border hover:border-border-strong transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-sm text-text-secondary"
                      style={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {pago.fecha}
                    </span>
                    <span
                      className="font-semibold text-accent"
                      style={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      {Number(pago.cantidad).toFixed(2)} €
                    </span>
                  </div>
                  {pago.concepto && (
                    <p className="text-sm text-text-secondary mt-1">{pago.concepto}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(pago)}
                    className="text-[11px] uppercase tracking-[0.08em] text-text-primary hover:text-accent transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingPagoId(pago.id)}
                    className="text-[11px] uppercase tracking-[0.08em] text-danger hover:text-text-primary transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={Boolean(deletingPagoId)}
          title="Eliminar pago"
          description="Esta acción eliminará el pago de forma permanente."
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          destructive
          isLoading={isDeleting}
          onClose={() => !isDeleting && setDeletingPagoId(null)}
          onConfirm={handleDelete}
        />
      </div>
    </Card>
  );
}
