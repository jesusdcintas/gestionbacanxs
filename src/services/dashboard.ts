import type { ServiceResponse } from '../types/app';
import type { Database } from '../types/database';
import { getMonthRange, getTodayIsoDate, isUpcomingDate } from '../utils/dates';
import { formatMonthLabel } from '../utils/format';
import { getSupabaseServerClient } from '../lib/supabase';

export interface DashboardMetric {
  label: string;
  value: number;
  formatted: string;
  tone: 'accent' | 'positive' | 'warning' | 'neutral';
  note: string;
}

export interface DashboardMovement {
  id: string;
  type: 'ingreso' | 'gasto';
  title: string;
  amount: number;
  formattedAmount: string;
  date: string;
  dateLabel: string;
  detail: string;
}

export interface DashboardEvent {
  id: string;
  nombre: string;
  fecha: string | null;
  lugar: string | null;
  cliente: string | null;
  precio: number;
  estado_financiero: 'no_pagado' | 'parcialmente_pagado' | 'pagado';
  estado_trabajo: 'confirmado' | 'realizado' | 'cancelado';
  estado_completo: 'confirmado' | 'realizado' | 'completado' | 'cancelado';
}

export interface DashboardData {
  metrics: DashboardMetric[];
  recentMovements: DashboardMovement[];
  upcomingEvents: DashboardEvent[];
  userName: string;
}

type EventRow = Database['public']['Tables']['eventos']['Row'];
type IngresoRow = Database['public']['Tables']['pagos_evento']['Row'];
type GastoRow = Database['public']['Tables']['gastos']['Row'];

export async function getDashboardData(context: Parameters<typeof getSupabaseServerClient>[0]): Promise<ServiceResponse<DashboardData>> {
  try {
    const supabase = getSupabaseServerClient(context);
    const { start, end } = getMonthRange();
    const today = getTodayIsoDate();

    const [
      userResult,
      eventosResult,
      ingresosMonthResult,
      gastosMonthResult,
      ingresosRecentResult,
      gastosRecentResult,
      ingresosAllResult,
      gastosAllResult,
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('eventos')
        .select('id, nombre, fecha, lugar, cliente, presupuesto, estado_financiero, estado_trabajo, estado_completo')
        .gte('fecha', today)
        .order('fecha', { ascending: true })
        .limit(3),
      supabase.from('pagos_evento').select('cantidad').gte('fecha', start).lte('fecha', end),
      supabase.from('gastos').select('cantidad').gte('fecha', start).lte('fecha', end),
      supabase
        .from('pagos_evento')
        .select('id, concepto, cantidad, fecha')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('gastos')
        .select('id, concepto, cantidad, categoria, fecha')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('pagos_evento').select('cantidad'),
      supabase.from('gastos').select('cantidad'),
    ]);

    if (userResult.error) {
      return { data: null, error: userResult.error.message };
    }

    if (eventosResult.error) {
      return { data: null, error: eventosResult.error.message };
    }

    if (ingresosMonthResult.error) {
      return { data: null, error: ingresosMonthResult.error.message };
    }

    if (gastosMonthResult.error) {
      return { data: null, error: gastosMonthResult.error.message };
    }

    if (ingresosRecentResult.error) {
      return { data: null, error: ingresosRecentResult.error.message };
    }

    if (gastosRecentResult.error) {
      return { data: null, error: gastosRecentResult.error.message };
    }

    if (ingresosAllResult.error) {
      return { data: null, error: ingresosAllResult.error.message };
    }

    if (gastosAllResult.error) {
      return { data: null, error: gastosAllResult.error.message };
    }

    const ingresosMonth = ingresosMonthResult.data ?? [];
    const gastosMonth = gastosMonthResult.data ?? [];
    const ingresosRecent = ingresosRecentResult.data ?? [];
    const gastosRecent = gastosRecentResult.data ?? [];
    const eventos = eventosResult.data ?? [];
    const ingresosAll = ingresosAllResult.data ?? [];
    const gastosAll = gastosAllResult.data ?? [];

    const totalIngresosMes = ingresosMonth.reduce((sum, row) => sum + Number(row.cantidad), 0);
    const totalGastosMes = gastosMonth.reduce((sum, row) => sum + Number(row.cantidad), 0);
    const beneficioMes = totalIngresosMes - totalGastosMes;
    const totalIngresosHistoricos = ingresosAll.reduce((sum, row) => sum + Number(row.cantidad), 0);
    const totalGastosHistoricos = gastosAll.reduce((sum, row) => sum + Number(row.cantidad), 0);
    const saldoTotal = totalIngresosHistoricos - totalGastosHistoricos;

    const upcomingEvents = (eventos as EventRow[])
      .filter((event) => isUpcomingDate(event.fecha))
      .slice(0, 3)
      .map((event) => ({
        id: event.id,
        nombre: event.nombre,
        fecha: event.fecha,
        lugar: event.lugar,
        cliente: event.cliente,
        precio: Number(event.presupuesto ?? 0),
        estado_financiero: event.estado_financiero,
        estado_trabajo: event.estado_trabajo,
        estado_completo: event.estado_completo,
      }));

    const recentMovements: DashboardMovement[] = [...(ingresosRecent as IngresoRow[]).map((row) => ({
      id: `ingreso-${row.id}`,
      type: 'ingreso' as const,
      title: row.concepto ?? 'Pago recibido',
      amount: Number(row.cantidad),
      formattedAmount: `+ ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(row.cantidad))}`,
      date: row.fecha,
      dateLabel: formatMonthLabel(new Date(row.fecha)),
      detail: 'Ingreso registrado',
    })),
    ...(gastosRecent as GastoRow[]).map((row) => ({
      id: `gasto-${row.id}`,
      type: 'gasto' as const,
      title: row.concepto,
      amount: Number(row.cantidad),
      formattedAmount: `- ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(row.cantidad))}`,
      date: row.fecha,
      dateLabel: formatMonthLabel(new Date(row.fecha)),
      detail: row.categoria,
    }))]
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 8);

    const userName = userResult.data.user?.email ? userResult.data.user.email.split('@')[0] : 'Usuario';

    const metrics: DashboardMetric[] = [
      {
        label: 'Ingresos del mes',
        value: totalIngresosMes,
        formatted: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalIngresosMes),
        tone: 'positive',
        note: `Rango ${start} a ${end}`,
      },
      {
        label: 'Gastos del mes',
        value: totalGastosMes,
        formatted: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalGastosMes),
        tone: 'warning',
        note: `Rango ${start} a ${end}`,
      },
      {
        label: 'Beneficio del mes',
        value: beneficioMes,
        formatted: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(beneficioMes),
        tone: beneficioMes >= 0 ? 'positive' : 'warning',
        note: 'Ingresos menos gastos del periodo actual',
      },
      {
        label: 'Saldo total',
        value: saldoTotal,
        formatted: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(saldoTotal),
        tone: 'accent',
        note: `Movimientos cargados hasta ${today}`,
      },
    ];

    return {
      data: {
        metrics,
        recentMovements,
        upcomingEvents,
        userName,
      },
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al cargar el dashboard.';
    return { data: null, error: message };
  }
}
