import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { StampLabel } from '../ui/StampLabel';

type Tipo = 'entrada' | 'salida';

interface Props {
  onSuccess?: () => void;
}

export default function MovimientoFondoForm({ onSuccess }: Props) {
  const [tipo, setTipo] = useState<Tipo>('entrada');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [concepto, setConcepto] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFecha(new Date().toISOString().split('T')[0]);
    setConcepto('');
    setCantidad('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cantidadNum = parseFloat(cantidad);
    if (!cantidadNum || cantidadNum <= 0) {
      setError('La cantidad debe ser mayor que 0');
      return;
    }
    if (!concepto.trim()) {
      setError('Indica un concepto');
      return;
    }

    setEnviando(true);
    try {
      const response = await fetch('/api/fondo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          concepto: concepto.trim(),
          cantidad: tipo === 'entrada' ? cantidadNum : -cantidadNum,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo registrar el movimiento');
      }

      resetForm();
      onSuccess?.();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3">
        <StampLabel rotate="left">Nuevo movimiento</StampLabel>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTipo('entrada')}
          className={`flex-1 px-3 py-2 border text-[11px] uppercase tracking-[0.08em] transition-colors ${
            tipo === 'entrada'
              ? 'bg-accent border-accent text-[#0a0a0a] font-bold'
              : 'border-border-strong text-text-primary hover:bg-surface-hover'
          }`}
        >
          + Entrada al fondo
        </button>
        <button
          type="button"
          onClick={() => setTipo('salida')}
          className={`flex-1 px-3 py-2 border text-[11px] uppercase tracking-[0.08em] transition-colors ${
            tipo === 'salida'
              ? 'bg-danger-bg border-danger text-danger font-bold'
              : 'border-border-strong text-text-primary hover:bg-surface-hover'
          }`}
        >
          − Salida del fondo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input
          label="Fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          required
        />
        <Input
          label="Cantidad"
          type="number"
          step="0.01"
          min="0"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          required
          placeholder="0.00"
        />
        <Input
          label="Concepto"
          type="text"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          required
          placeholder="Ej: Aportación inicial"
        />
      </div>

      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={enviando}>
          {enviando ? 'Guardando...' : 'Registrar movimiento'}
        </Button>
      </div>
    </form>
  );
}
