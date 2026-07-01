import { CalendarDays, MapPin } from 'lucide-react';
import type { DashboardEvent } from '../../services/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { StampLabel } from '../ui/StampLabel';
import { formatDate } from '../../utils/format';
import { getEstadoStamp, getEstadoVisibleLabel } from '../../utils/eventoEstado';

interface UpcomingEventsProps {
  events: DashboardEvent[];
}

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <Card>
      <CardHeader>
        <StampLabel rotate="left">Próximo evento</StampLabel>
        <CardTitle className="mt-3">Próximos eventos</CardTitle>
        <CardDescription className="mt-1">Los tres eventos más cercanos en fecha.</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length > 0 ? (
          <ul className="space-y-3">
            {events.map((event) => {
              const stamp = getEstadoStamp(event.estado_completo);

              return (
                <li className="border border-border bg-[#0a0a0a] p-4" key={event.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className="text-sm uppercase italic text-text-primary"
                        style={{ fontFamily: '"Archivo Black", sans-serif' }}
                      >
                        {event.nombre}
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-text-secondary">
                        <p className="flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.5} />
                          <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>{formatDate(event.fecha)}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} /> {event.lugar ?? 'Sin lugar'}
                        </p>
                      </div>
                    </div>
                    <StampLabel variant={stamp.variant} rotate={stamp.rotate}>
                      {getEstadoVisibleLabel(event.estado_completo)}
                    </StampLabel>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-text-secondary">
                    <span>
                      Cliente: <span className="text-text-primary">{event.cliente ?? 'Sin cliente'}</span>
                    </span>
                    <span>
                      Precio:{' '}
                      <span className="text-accent" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
                          event.precio,
                        )}
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-text-secondary">No hay eventos próximos para mostrar.</p>
        )}
      </CardContent>
    </Card>
  );
}
