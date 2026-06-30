import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { StampLabel } from '../ui/StampLabel';

interface Socio {
  id: string;
  nombre: string;
}

interface Reparto {
  socio_id: string | null;
  nombre: string;
  cantidad: number;
}

interface Props {
  eventoId: string;
  socios: Socio[];
  repartosIniciales: Reparto[];
  netoRepartible: number;
}

export default function RepartoSection({ 
  eventoId, 
  socios, 
  repartosIniciales,
  netoRepartible 
}: Props) {
  const [repartos, setRepartos] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  // Inicializar repartos
  useEffect(() => {
    const inicial: Record<string, string> = {};
    
    // Socios
    socios.forEach(socio => {
      const reparto = repartosIniciales.find(r => r.socio_id === socio.id);
      inicial[socio.id] = reparto ? reparto.cantidad.toString() : '0';
    });
    
    // Fondo empresa
    const repartoFondo = repartosIniciales.find(r => r.socio_id === null);
    inicial['fondo'] = repartoFondo ? repartoFondo.cantidad.toString() : '0';
    
    setRepartos(inicial);
  }, [socios, repartosIniciales]);

  // Calcular total repartido
  const totalRepartido = Object.values(repartos).reduce((sum, val) => {
    return sum + (parseFloat(val) || 0);
  }, 0);

  const diferencia = netoRepartible - totalRepartido;
  const esValido = Math.abs(diferencia) < 0.01; // Tolerancia de 1 céntimo

  const handleChange = (key: string, value: string) => {
    setRepartos({
      ...repartos,
      [key]: value,
    });
  };

  const distribuirEquitativamente = () => {
    const numParticipantes = socios.length + 1; // socios + fondo
    const parteIgual = netoRepartible / numParticipantes;
    
    const nuevoReparto: Record<string, string> = {};
    socios.forEach(socio => {
      nuevoReparto[socio.id] = parteIgual.toFixed(2);
    });
    nuevoReparto['fondo'] = parteIgual.toFixed(2);
    
    setRepartos(nuevoReparto);
  };

  const handleGuardar = async () => {
    if (!esValido) {
      alert('El reparto debe sumar exactamente el neto repartible');
      return;
    }

    setGuardando(true);

    try {
      // Convertir a formato para la API
      const repartosData = [
        // Socios
        ...socios.map(socio => ({
          socio_id: socio.id,
          cantidad: parseFloat(repartos[socio.id] || '0'),
        })),
        // Fondo empresa
        {
          socio_id: null,
          cantidad: parseFloat(repartos['fondo'] || '0'),
        },
      ].filter(r => r.cantidad > 0); // Solo incluir cantidades > 0

      const response = await fetch(`/api/repartos/${eventoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repartos: repartosData }),
      });

      if (!response.ok) throw new Error('Error al guardar reparto');

      alert('Reparto guardado correctamente');
      window.location.reload(); // Recargar para ver cambios
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar el reparto');
    } finally {
      setGuardando(false);
    }
  };

  if (netoRepartible <= 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-text-primary">
            No hay neto repartible para este evento.
          </p>
          <p className="text-sm text-text-secondary mt-2">
            Asegúrate de que el evento tenga pagos recibidos y que superen los gastos.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <StampLabel rotate="right">Reparto del neto</StampLabel>
            <p className="mt-2 text-sm text-text-secondary">
              Neto repartible:{' '}
              <span
                className="font-semibold text-accent"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {netoRepartible.toFixed(2)} €
              </span>
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={distribuirEquitativamente}
          >
            Distribuir equitativamente
          </Button>
        </div>

        <div className="space-y-3">
          {/* Socios */}
          {socios.map((socio) => (
            <div key={socio.id} className="flex items-center gap-3 p-3 bg-[#0a0a0a] border border-border">
              <div className="flex-1">
                <span className="text-sm font-medium text-text-primary">{socio.nombre}</span>
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={repartos[socio.id] || '0'}
                  onChange={(e) => handleChange(socio.id, e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <span className="text-sm text-text-secondary w-8">€</span>
            </div>
          ))}

          {/* Fondo empresa */}
          <div className="flex items-center gap-3 p-3 bg-[#0a0a0a] border-2 border-accent/40">
            <div className="flex-1 flex items-center gap-2">
              <StampLabel variant="accent" rotate="left">Fondo</StampLabel>
              <span className="text-sm font-medium text-text-primary">Fondo de empresa</span>
            </div>
            <div className="w-32">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={repartos['fondo'] || '0'}
                onChange={(e) => handleChange('fondo', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <span className="text-sm text-text-secondary w-8">€</span>
          </div>
        </div>

        {/* Resumen */}
        <div
          className={`p-4 border ${
            esValido
              ? 'bg-[#0a0a0a] border-accent/40'
              : 'bg-danger-bg border-danger/60'
          }`}
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          <div className="flex justify-between text-sm mb-1">
            <span
              className="text-text-secondary uppercase tracking-[0.08em] text-[11px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Total repartido
            </span>
            <span className={esValido ? 'text-accent' : 'text-danger'}>
              {totalRepartido.toFixed(2)} €
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span
              className="text-text-secondary uppercase tracking-[0.08em] text-[11px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Diferencia
            </span>
            <span className={esValido ? 'text-accent' : 'text-danger'}>
              {diferencia.toFixed(2)} €
            </span>
          </div>
          {!esValido && (
            <p
              className="text-xs text-danger mt-2"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              ⚠️ El reparto debe sumar exactamente {netoRepartible.toFixed(2)} €
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleGuardar}
            disabled={!esValido || guardando}
          >
            {guardando ? 'Guardando...' : 'Guardar reparto'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
