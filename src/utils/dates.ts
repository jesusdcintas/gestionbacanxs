function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function getMonthRange(referenceDate = new Date()) {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function getTodayIsoDate(referenceDate = new Date()): string {
  return [referenceDate.getFullYear(), pad(referenceDate.getMonth() + 1), pad(referenceDate.getDate())].join('-');
}

export function isUpcomingDate(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  return value >= getTodayIsoDate();
}
