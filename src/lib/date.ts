/**
 * Formatea una fecha en formato español (DD/MM/YYYY)
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-ES').format(d);
}

/**
 * Formatea una fecha con hora (DD/MM/YYYY HH:MM)
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

/**
 * Retorna la fecha actual en formato YYYY-MM-DD (para inputs date)
 */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Obtiene el primer día del mes actual en formato YYYY-MM-DD
 */
export function startOfMonth(): string {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().split('T')[0];
}

/**
 * Obtiene el último día del mes actual en formato YYYY-MM-DD
 */
export function endOfMonth(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return date.toISOString().split('T')[0];
}

/**
 * Retorna una fecha relativa en español (hace X días, etc.)
 */
export function relativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
  if (days < 365) return `Hace ${Math.floor(days / 30)} meses`;
  return `Hace ${Math.floor(days / 365)} años`;
}
