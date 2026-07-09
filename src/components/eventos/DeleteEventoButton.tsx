import { useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog';
import { Button } from '../ui/Button';

interface Props {
  eventoId: string;
}

export default function DeleteEventoButton({ eventoId }: Props) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/eventos/${eventoId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo eliminar el evento');
      }
      window.location.href = '/eventos';
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo eliminar el evento');
      setOpen(false);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="danger"
        onClick={() => setOpen(true)}
        className="w-full xl:w-auto"
      >
        Eliminar evento
      </Button>

      {errorMessage ? (
        <div className="border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">{errorMessage}</div>
      ) : null}

      <ConfirmDialog
        open={open}
        title="Eliminar evento"
        description="Se eliminarán también sus pagos, gastos y repartos asociados. Esta acción no se puede deshacer."
        confirmLabel="Eliminar evento"
        destructive
        isLoading={isDeleting}
        onClose={() => !isDeleting && setOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
