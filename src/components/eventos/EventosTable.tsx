import { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '../../lib/format';
import { formatDate } from '../../lib/date';
import type { Database } from '../../types/database';
import type { EstadoFinanciero, EstadoTrabajo } from '../../utils/eventoEstado';
import { StampLabel } from '../ui/StampLabel';

type Evento = Database['public']['Tables']['eventos']['Row'];
type EventoConEstadoReparto = Evento & {
  reparto_completo?: boolean;
  pendiente_reparto?: number;
};

interface Props {
  eventos: EventoConEstadoReparto[];
  editBasePath: string;
}

type SortKey =
  | 'nombre'
  | 'fecha'
  | 'lugar'
  | 'cliente'
  | 'con_factura'
  | 'presupuesto'
  | 'estado_trabajo'
  | 'estado_financiero';

type SortDirection = 'asc' | 'desc';

const CLIENTE_TODOS = '__todos__';

function isSortKey(value: string): value is SortKey {
  return [
    'nombre',
    'fecha',
    'lugar',
    'cliente',
    'con_factura',
    'presupuesto',
    'estado_trabajo',
    'estado_financiero',
  ].includes(value);
}

function isSortDirection(value: string): value is SortDirection {
  return value === 'asc' || value === 'desc';
}

export default function EventosTable({ eventos, editBasePath }: Props) {
  if (eventos.length === 0) {
    return (
      <div className="py-12 text-center text-text-secondary">
        No hay eventos registrados. Crea tu primer evento.
      </div>
    );
  }

  const [estados, setEstados] = useState<
    Record<string, { estado_financiero: EstadoFinanciero; estado_trabajo: EstadoTrabajo }>
  >(() =>
    Object.fromEntries(
      eventos.map((evento) => [
        evento.id,
        {
          estado_financiero: evento.estado_financiero,
          estado_trabajo: evento.estado_trabajo,
        },
      ]),
    ),
  );
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [clienteFiltro, setClienteFiltro] = useState<string>(CLIENTE_TODOS);
  const [busqueda, setBusqueda] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('fecha');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [urlReady, setUrlReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trabajoOptions: Array<{ value: EstadoTrabajo; label: string }> = useMemo(
    () => [
      { value: 'confirmado', label: 'Confirmado' },
      { value: 'realizado', label: 'Realizado' },
      { value: 'cancelado', label: 'Cancelado' },
    ],
    [],
  );

  const financieroOptions: Array<{ value: EstadoFinanciero; label: string }> = useMemo(
    () => [
      { value: 'no_pagado', label: 'No pagado' },
      { value: 'parcialmente_pagado', label: 'Parcialmente pagado' },
      { value: 'pagado', label: 'Pagado' },
    ],
    [],
  );

  const actualizarEstados = async (
    id: string,
    siguiente: { estado_trabajo: EstadoTrabajo; estado_financiero: EstadoFinanciero },
    previo: { estado_trabajo: EstadoTrabajo; estado_financiero: EstadoFinanciero },
  ) => {
    try {
      setSavingById((curr) => ({ ...curr, [id]: true }));
      setErrorMessage(null);
      const response = await fetch(`/api/eventos/${id}/estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siguiente),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo actualizar el estado del evento');
      }
    } catch (error) {
      setEstados((curr) => ({ ...curr, [id]: previo }));
      const message = error instanceof Error ? error.message : 'Error al actualizar estado';
      setErrorMessage(message);
    } finally {
      setSavingById((curr) => ({ ...curr, [id]: false }));
    }
  };

  const onChangeTrabajo = (id: string, value: EstadoTrabajo) => {
    const previo = estados[id];
    const siguiente = { ...previo, estado_trabajo: value };
    setEstados((curr) => ({ ...curr, [id]: siguiente }));
    void actualizarEstados(id, siguiente, previo);
  };

  const onChangeFinanciero = (id: string, value: EstadoFinanciero) => {
    const previo = estados[id];
    const siguiente = { ...previo, estado_financiero: value };
    setEstados((curr) => ({ ...curr, [id]: siguiente }));
    void actualizarEstados(id, siguiente, previo);
  };

  const clientes = useMemo(() => {
    const unicos = Array.from(
      new Set(eventos.map((evento) => evento.cliente?.trim()).filter((cliente): cliente is string => Boolean(cliente))),
    );

    return unicos.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [eventos]);

  const normalizar = (value: string | null | undefined) =>
    (value ?? '').trim().toLocaleLowerCase('es');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const cliente = params.get('cliente');
    const q = params.get('q');
    const sort = params.get('sort');
    const dir = params.get('dir');

    if (cliente) {
      setClienteFiltro(cliente);
    }
    if (q) {
      setBusqueda(q);
    }
    if (sort && isSortKey(sort)) {
      setSortKey(sort);
    }
    if (dir && isSortDirection(dir)) {
      setSortDirection(dir);
    }

    setUrlReady(true);
  }, []);

  useEffect(() => {
    if (!urlReady) return;

    const params = new URLSearchParams(window.location.search);

    if (clienteFiltro === CLIENTE_TODOS) {
      params.delete('cliente');
    } else {
      params.set('cliente', clienteFiltro);
    }

    if (busqueda.trim()) {
      params.set('q', busqueda.trim());
    } else {
      params.delete('q');
    }

    params.set('sort', sortKey);
    params.set('dir', sortDirection);

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [busqueda, clienteFiltro, sortDirection, sortKey, urlReady]);

  const eventosVisibles = useMemo(() => {
    const termino = normalizar(busqueda);

    const clienteFiltroValido =
      clienteFiltro === CLIENTE_TODOS || clientes.includes(clienteFiltro);

    const filtrados =
      !clienteFiltroValido || clienteFiltro === CLIENTE_TODOS
        ? [...eventos]
        : eventos.filter((evento) => (evento.cliente ?? '').trim() === clienteFiltro);

    const porBusqueda = termino
      ? filtrados.filter((evento) => {
          const nombre = normalizar(evento.nombre);
          const lugar = normalizar(evento.lugar);
          const cliente = normalizar(evento.cliente);
          return nombre.includes(termino) || lugar.includes(termino) || cliente.includes(termino);
        })
      : filtrados;

    porBusqueda.sort((a, b) => {
      const estadoA = estados[a.id] ?? {
        estado_trabajo: a.estado_trabajo,
        estado_financiero: a.estado_financiero,
      };
      const estadoB = estados[b.id] ?? {
        estado_trabajo: b.estado_trabajo,
        estado_financiero: b.estado_financiero,
      };

      let comp = 0;
      switch (sortKey) {
        case 'nombre':
          comp = normalizar(a.nombre).localeCompare(normalizar(b.nombre), 'es', {
            sensitivity: 'base',
          });
          break;
        case 'fecha':
          comp = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
          break;
        case 'lugar':
          comp = normalizar(a.lugar).localeCompare(normalizar(b.lugar), 'es', {
            sensitivity: 'base',
          });
          break;
        case 'cliente':
          comp = normalizar(a.cliente).localeCompare(normalizar(b.cliente), 'es', {
            sensitivity: 'base',
          });
          break;
        case 'con_factura':
          comp = Number(a.con_factura) - Number(b.con_factura);
          break;
        case 'presupuesto':
          comp = Number(a.presupuesto) - Number(b.presupuesto);
          break;
        case 'estado_trabajo':
          comp = estadoA.estado_trabajo.localeCompare(estadoB.estado_trabajo, 'es', {
            sensitivity: 'base',
          });
          break;
        case 'estado_financiero':
          comp = estadoA.estado_financiero.localeCompare(estadoB.estado_financiero, 'es', {
            sensitivity: 'base',
          });
          break;
      }

      return sortDirection === 'asc' ? comp : -comp;
    });

    return porBusqueda;
  }, [busqueda, clienteFiltro, clientes, eventos, estados, sortDirection, sortKey]);

  const changeSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((curr) => (curr === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextKey);
    setSortDirection('asc');
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const openItem = (id: string) => {
    window.location.href = `${editBasePath}/${id}/detalle`;
  };

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openItem(id);
    }
  };

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <div className="border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">{errorMessage}</div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Filtrar por cliente</p>
            <select
              value={clienteFiltro}
              onChange={(event) => setClienteFiltro(event.target.value)}
              className="mt-1 min-w-[240px] border border-border bg-[#0a0a0a] px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value={CLIENTE_TODOS}>Todos los clientes</option>
              {clientes.map((cliente) => (
                <option key={cliente} value={cliente}>
                  {cliente}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Buscar</p>
            <input
              type="text"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Nombre, lugar o cliente"
              className="mt-1 min-w-[240px] border border-border bg-[#0a0a0a] px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
            />
          </div>
        </div>
        <p className="text-xs text-text-secondary">
          Mostrando {eventosVisibles.length} de {eventos.length} eventos
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left">
              <button
                type="button"
                onClick={() => changeSort('nombre')}
                className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary hover:text-text-primary"
              >
                Nombre <span>{sortIndicator('nombre')}</span>
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button
                type="button"
                onClick={() => changeSort('fecha')}
                className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary hover:text-text-primary"
              >
                Fecha <span>{sortIndicator('fecha')}</span>
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button
                type="button"
                onClick={() => changeSort('lugar')}
                className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary hover:text-text-primary"
              >
                Lugar <span>{sortIndicator('lugar')}</span>
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button
                type="button"
                onClick={() => changeSort('cliente')}
                className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary hover:text-text-primary"
              >
                Cliente <span>{sortIndicator('cliente')}</span>
              </button>
            </th>
            <th className="px-4 py-3 text-right">
              <button
                type="button"
                onClick={() => changeSort('presupuesto')}
                className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary hover:text-text-primary"
              >
                Presupuesto <span>{sortIndicator('presupuesto')}</span>
              </button>
            </th>
            <th className="px-4 py-3 text-center">
              <button
                type="button"
                onClick={() => changeSort('con_factura')}
                className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary hover:text-text-primary"
              >
                Facturable <span>{sortIndicator('con_factura')}</span>
              </button>
            </th>
            <th className="px-4 py-3 text-center">
              <button
                type="button"
                onClick={() => changeSort('estado_trabajo')}
                className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary hover:text-text-primary"
              >
                Trabajo <span>{sortIndicator('estado_trabajo')}</span>
              </button>
            </th>
            <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
              Reparto
            </th>
            <th className="px-4 py-3 text-center">
              <button
                type="button"
                onClick={() => changeSort('estado_financiero')}
                className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary hover:text-text-primary"
              >
                Financiero <span>{sortIndicator('estado_financiero')}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {eventosVisibles.map((evento) => {
            const estadoActual = estados[evento.id] ?? {
              estado_trabajo: evento.estado_trabajo,
              estado_financiero: evento.estado_financiero,
            };

            return (
              <tr
                key={evento.id}
                className="cursor-pointer border-b border-border transition-colors hover:bg-surface-hover"
                onClick={() => openItem(evento.id)}
                onKeyDown={(event) => handleRowKeyDown(event, evento.id)}
                tabIndex={0}
                role="button"
                aria-label={`Ver evento ${evento.nombre}`}
                title="Ver evento"
              >
                <td className="px-4 py-3 text-sm font-medium text-text-primary">{evento.nombre}</td>
                <td className="px-4 py-3 text-sm text-text-secondary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {formatDate(evento.fecha)}
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">{evento.lugar || '—'}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{evento.cliente || '—'}</td>
                <td className="px-4 py-3 text-right text-sm text-accent" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {formatCurrency(evento.presupuesto)}
                </td>
                <td className="px-4 py-3 text-center text-xs text-text-primary">
                  {evento.con_factura ? 'Sí' : 'No'}
                </td>
                <td className="px-4 py-3 text-center">
                  <select
                    value={estadoActual.estado_trabajo}
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      onChangeTrabajo(evento.id, event.target.value as EstadoTrabajo)
                    }
                    className="w-full border border-border bg-[#0a0a0a] px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                    aria-label="Estado de trabajo"
                  >
                    {trabajoOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-center">
                  {evento.reparto_completo ? (
                    <StampLabel rotate="none" variant="accent">Completo</StampLabel>
                  ) : (
                    <StampLabel rotate="none" variant="danger">Pendiente</StampLabel>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="space-y-1">
                    <select
                      value={estadoActual.estado_financiero}
                      onClick={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        onChangeFinanciero(evento.id, event.target.value as EstadoFinanciero)
                      }
                      className="w-full border border-border bg-[#0a0a0a] px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                      aria-label="Estado financiero"
                    >
                      {financieroOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {savingById[evento.id] && (
                      <p className="text-[10px] uppercase tracking-[0.08em] text-text-secondary">Guardando...</p>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {eventosVisibles.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-sm text-text-secondary">
                No hay eventos para el cliente seleccionado.
              </td>
            </tr>
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
}
