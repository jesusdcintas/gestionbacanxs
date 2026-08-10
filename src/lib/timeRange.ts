export type TimeRange = '1M' | '3M' | '6M' | '1A' | 'TODO';

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1A', label: '1A' },
  { value: 'TODO', label: 'Todo' },
];

function monthsForRange(range: TimeRange): number | null {
  if (range === '1M') return 1;
  if (range === '3M') return 3;
  if (range === '6M') return 6;
  if (range === '1A') return 12;
  return null;
}

function parseMonthKey(key: string) {
  const [yearRaw, monthRaw] = key.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  return new Date(year, month - 1, 1);
}

export function filterByTimeRange<T extends { mes: string }>(rows: T[], range: TimeRange): T[] {
  const months = monthsForRange(range);
  if (months === null) return rows;

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  return rows.filter((row) => {
    const date = parseMonthKey(row.mes);
    return date ? date >= from : false;
  });
}
