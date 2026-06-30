import { useState } from 'react';
import FondoMovimientosTable, { type MovimientoFondo } from './FondoMovimientosTable';

interface Props {
  movimientos: MovimientoFondo[];
}

export default function FondoMovimientosList({ movimientos: initial }: Props) {
  const [movimientos, setMovimientos] = useState(initial);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este movimiento manual del fondo?')) return;

    try {
      const response = await fetch(`/api/fondo/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo eliminar');
      }
      setMovimientos(movimientos.filter((m) => m.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  return <FondoMovimientosTable movimientos={movimientos} onDelete={handleDelete} />;
}
