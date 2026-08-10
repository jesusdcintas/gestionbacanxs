import { useMemo, useState } from 'react';
import { formatCurrency } from '../../lib/format';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { StampLabel } from '../ui/StampLabel';
import GastosTable from './GastosTable';
import type { Database } from '../../types/database';

type Gasto = Database['public']['Tables']['gastos']['Row'];
type GastoPago = Database['public']['Tables']['gasto_pagos']['Row'] & {
  profiles?: { nombre: string } | null;
};
type Profile = Database['public']['Tables']['profiles']['Row'];
type GastoEnriquecido = Gasto & {
  eventos?: { nombre: string } | null;
  gasto_pagos?: GastoPago[];
};

type Filtro = 'todos' | 'generales' | 'eventos';
type TipoFiltro = 'todos' | 'directo_evento' | 'inversion_empresa';

interface Props {
  todosIniciales: GastoEnriquecido[];
  profiles: Profile[];
  filtro: Filtro;
  tipoFiltro: TipoFiltro;
  emptyMessage: string;
}

const tabs: { value: Filtro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'generales', label: 'Generales' },
  { value: 'eventos', label: 'De eventos' },
];

const tipoTabs: { value: TipoFiltro; label: string }[] = [
  { value: 'todos', label: 'Todos los tipos' },
  { value: 'directo_evento', label: 'Gasto del evento' },
  { value: 'inversion_empresa', label: 'Inversión de empresa' },
];

const sumar = (arr: { cantidad: number }[]) => arr.reduce((sum, gasto) => sum + Number(gasto.cantidad), 0);

export default function GastosDashboard({ todosIniciales, profiles, filtro, tipoFiltro, emptyMessage }: Props) {
  const [todos, setTodos] = useState(todosIniciales);

  const generales = useMemo(() => todos.filter((gasto) => gasto.evento_id === null), [todos]);
  const deEventos = useMemo(() => todos.filter((gasto) => gasto.evento_id !== null), [todos]);
  const directos = useMemo(() => todos.filter((gasto) => gasto.tipo_gasto === 'directo_evento'), [todos]);
  const inversiones = useMemo(() => todos.filter((gasto) => gasto.tipo_gasto === 'inversion_empresa'), [todos]);

  const gastosBase = filtro === 'generales' ? generales : filtro === 'eventos' ? deEventos : todos;
  const gastos = tipoFiltro === 'todos' ? gastosBase : gastosBase.filter((gasto) => gasto.tipo_gasto === tipoFiltro);

  const removeIds = (ids: string[]) => {
    const setIds = new Set(ids);
    setTodos((current) => current.filter((gasto) => !setIds.has(gasto.id)));
  };

  const totalAll = sumar(todos);
  const totalGenerales = sumar(generales);
  const totalEventos = sumar(deEventos);
  const totalDirectos = sumar(directos);
  const totalInversiones = sumar(inversiones);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Total gastos</p>
            <p className="mt-2 text-2xl font-semibold text-danger" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              −{formatCurrency(totalAll)}
            </p>
            <p className="mt-1 text-[11px] text-text-secondary">{todos.length} movimientos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Generales</p>
              <StampLabel rotate="none" variant="outline">Sin evento</StampLabel>
            </div>
            <p className="mt-2 text-2xl font-semibold text-text-primary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              −{formatCurrency(totalGenerales)}
            </p>
            <p className="mt-1 text-[11px] text-text-secondary">{generales.length} movimientos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">De eventos</p>
              <StampLabel rotate="none" variant="outline">Asignados</StampLabel>
            </div>
            <p className="mt-2 text-2xl font-semibold text-text-primary" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              −{formatCurrency(totalEventos)}
            </p>
            <p className="mt-1 text-[11px] text-text-secondary">{deEventos.length} movimientos</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const activo = tab.value === filtro;
          const count = tab.value === 'todos' ? todos.length : tab.value === 'generales' ? generales.length : deEventos.length;

          return (
            <a
              key={tab.value}
              href={`/gastos?filtro=${tab.value}&tipo=${tipoFiltro}`}
              className={`px-4 py-2 text-[11px] uppercase tracking-[0.08em] border-b-2 transition-colors ${
                activo ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
              <span className="ml-2 text-[10px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                ({count})
              </span>
            </a>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {tipoTabs.map((tab) => {
          const activo = tab.value === tipoFiltro;
          const base = tab.value === 'todos' ? todos : tab.value === 'directo_evento' ? directos : inversiones;
          const total = tab.value === 'todos' ? totalAll : tab.value === 'directo_evento' ? totalDirectos : totalInversiones;

          return (
            <a
              key={tab.value}
              href={`/gastos?filtro=${filtro}&tipo=${tab.value}`}
              className={`px-3 py-2 text-[11px] uppercase tracking-[0.08em] border transition-colors ${
                activo
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-border text-text-secondary hover:text-text-primary hover:border-border-strong'
              }`}
            >
              <span className="block">{tab.label}</span>
              <span className="mt-1 block text-[10px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                ({base.length}) −{formatCurrency(total)}
              </span>
            </a>
          );
        })}
      </div>

      <Card>
        <CardContent>
          <GastosTable
            gastos={gastos}
            profiles={profiles}
            emptyMessage={emptyMessage}
            editBasePath="/gastos"
            onGastoDeleted={(gasto) => removeIds([gasto.id])}
            onGastosDeleted={(ids) => removeIds(ids)}
          />
        </CardContent>
      </Card>
    </div>
  );
}