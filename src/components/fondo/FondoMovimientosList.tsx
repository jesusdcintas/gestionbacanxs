import { useState } from 'react';
import FondoMovimientosTable, { type MovimientoFondo } from './FondoMovimientosTable';
import ConfirmDialog from '../ui/ConfirmDialog';

interface Props {
  movimientos: MovimientoFondo[];
}

export default function FondoMovimientosList({ movimientos: initial }: Props) {
  const [movimientos, setMovimientos] = useState(initial);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/fondo/${deletingId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo eliminar');
      }
      setMovimientos(movimientos.filter((m) => m.id !== deletingId));
      setDeletingId(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {errorMessage ? (
        <div className="mb-3 border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">{errorMessage}</div>
      ) : null}

      <FondoMovimientosTable movimientos={movimientos} onDelete={(id) => setDeletingId(id)} />

      <ConfirmDialog
        open={Boolean(deletingId)}
        title="Eliminar movimiento"
        description="Solo se eliminarán movimientos manuales del fondo. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        isLoading={isDeleting}
        onClose={() => !isDeleting && setDeletingId(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
