/**
 * Utilidades de cálculo financiero para el modelo refinado
 * Todas las funciones son puras (sin efectos secundarios)
 */

export const IVA_POR_DEFECTO = 21;

/**
 * Calcula la base imponible a partir del importe bruto (IVA incluido).
 *
 * @param presupuesto - Importe bruto del evento
 * @param conFactura - Si el evento se factura
 * @param ivaPct - Porcentaje de IVA (por defecto 21%)
 * @returns Base imponible sin IVA
 */
export function calcularBaseImponible(
  presupuesto: number,
  conFactura: boolean,
  ivaPct: number = IVA_POR_DEFECTO,
): number {
  if (!conFactura) {
    return presupuesto;
  }

  return presupuesto / (1 + ivaPct / 100);
}

/**
 * Calcula el importe de IVA incluido en el presupuesto bruto.
 *
 * @param presupuesto - Importe bruto del evento
 * @param conFactura - Si el evento se factura
 * @param ivaPct - Porcentaje de IVA (por defecto 21%)
 * @returns Importe de IVA
 */
export function calcularIVA(
  presupuesto: number,
  conFactura: boolean,
  ivaPct: number = IVA_POR_DEFECTO,
): number {
  if (!conFactura) {
    return 0;
  }

  const base = calcularBaseImponible(presupuesto, conFactura, ivaPct);
  return presupuesto - base;
}

/**
 * Calcula el ingreso neto de un evento facturable aplicando:
 * 1) quitar IVA del bruto (base imponible)
 * 2) aplicar IRPF sobre la base imponible
 */
export function calcularIngresoNeto(
  presupuesto: number,
  conFactura: boolean,
  retencionIRPF: number,
): number {
  if (!conFactura) {
    return presupuesto;
  }

  const base = calcularBaseImponible(presupuesto, conFactura);
  const retencion = (base * retencionIRPF) / 100;
  return base - retencion;
}

/**
 * Calcula la retención IRPF de un evento
 *
 * @param presupuesto - Presupuesto total del evento
 * @param conFactura - Si el evento se factura
 * @param retencionIRPF - Porcentaje de retención IRPF
 * @returns Cantidad retenida por IRPF
 */
export function calcularRetencionIRPF(
  presupuesto: number,
  conFactura: boolean,
  retencionIRPF: number,
): number {
  if (!conFactura) {
    return 0;
  }

  const base = calcularBaseImponible(presupuesto, conFactura);
  return (base * retencionIRPF) / 100;
}

/**
 * Calcula el neto repartible de un evento
 * Neto repartible = Ingreso neto - Gastos del evento
 *
 * @param ingresoNeto - Ingreso neto después de retención IRPF
 * @param gastosEvento - Total de gastos asociados al evento
 * @returns Neto repartible entre socios y fondo
 */
export function calcularNetoRepartible(
  ingresoNeto: number,
  gastosEvento: number,
): number {
  return ingresoNeto - gastosEvento;
}

/**
 * Cálculo integral del neto repartible desde inputs brutos del evento.
 */
export function calcularNetoRepartibleEvento(
  presupuesto: number,
  conFactura: boolean,
  retencionIRPF: number,
  gastosEvento: number,
): number {
  const ingresoNeto = calcularIngresoNeto(presupuesto, conFactura, retencionIRPF);
  return ingresoNeto - gastosEvento;
}

/**
 * Valida que un reparto sea válido
 * - La suma debe ser igual al neto repartible
 * - Todas las cantidades deben ser >= 0
 *
 * @param repartos - Array de cantidades a repartir
 * @param netoRepartible - Total que debe repartirse
 * @param tolerancia - Tolerancia para diferencias de redondeo (default: 0.01€)
 * @returns true si el reparto es válido
 */
export function validarReparto(
  repartos: number[],
  netoRepartible: number,
  tolerancia: number = 0.01,
): { valido: boolean; error?: string } {
  const hayNegativos = repartos.some((r) => r < 0);
  if (hayNegativos) {
    return {
      valido: false,
      error: 'Las cantidades del reparto no pueden ser negativas',
    };
  }

  const suma = repartos.reduce((acc, val) => acc + val, 0);

  const diferencia = Math.abs(suma - netoRepartible);
  if (diferencia > tolerancia) {
    return {
      valido: false,
      error: `La suma del reparto (${suma.toFixed(2)}€) no coincide con el neto repartible (${netoRepartible.toFixed(2)}€)`,
    };
  }

  return { valido: true };
}

/**
 * Calcula el saldo del fondo de empresa a partir de sus movimientos
 *
 * @param movimientos - Array de movimientos (positivo = entrada, negativo = salida)
 * @returns Saldo actual del fondo
 */
export function calcularSaldoFondo(movimientos: number[]): number {
  return movimientos.reduce((acc, val) => acc + val, 0);
}

/**
 * Calcula el balance de un socio (lo que ha cobrado vs lo que debería haber cobrado)
 *
 * @param totalCobrado - Total que ha cobrado el socio de los repartos
 * @param totalAportado - Total que el socio aportó a gastos y no ha sido reembolsado
 * @returns Balance neto del socio
 */
export function calcularBalanceSocio(
  totalCobrado: number,
  totalAportado: number,
): number {
  return totalCobrado - totalAportado;
}

/**
 * Formatea una cantidad monetaria para mostrar
 *
 * @param cantidad - Cantidad a formatear
 * @param incluirSigno - Si incluir el signo + para cantidades positivas
 * @returns String formateado (ej: "1.234,56 €")
 */
export function formatearMoneda(
  cantidad: number,
  incluirSigno: boolean = false,
): string {
  const signo = incluirSigno && cantidad > 0 ? '+' : '';
  return `${signo}${cantidad.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

/**
 * Calcula el porcentaje que representa una parte del total
 *
 * @param parte - Cantidad parcial
 * @param total - Cantidad total
 * @returns Porcentaje (0-100)
 */
export function calcularPorcentaje(parte: number, total: number): number {
  if (total === 0) return 0;
  return (parte / total) * 100;
}
