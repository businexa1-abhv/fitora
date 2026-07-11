export enum AnalyticsPeriod {
  DAILY = 'daily',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export function resolveDateRange(period: AnalyticsPeriod, from?: string, to?: string) {
  const end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999);

  let start: Date;
  if (from) {
    start = new Date(from);
    start.setHours(0, 0, 0, 0);
  } else {
    start = new Date(end);
    switch (period) {
      case AnalyticsPeriod.DAILY:
        start.setDate(start.getDate() - 29);
        break;
      case AnalyticsPeriod.MONTHLY:
        start.setMonth(start.getMonth() - 11);
        start.setDate(1);
        break;
      case AnalyticsPeriod.YEARLY:
        start.setFullYear(start.getFullYear() - 4);
        start.setMonth(0, 1);
        break;
    }
    start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

export function bucketKey(date: Date, period: AnalyticsPeriod): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (period === AnalyticsPeriod.DAILY) return `${y}-${m}-${d}`;
  if (period === AnalyticsPeriod.MONTHLY) return `${y}-${m}`;
  return String(y);
}

export function formatBucketLabel(key: string, period: AnalyticsPeriod): string {
  if (period === AnalyticsPeriod.YEARLY) return key;
  if (period === AnalyticsPeriod.MONTHLY) {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  }
  const [y, m, d] = key.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function generateBuckets(start: Date, end: Date, period: AnalyticsPeriod): string[] {
  const keys: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    keys.push(bucketKey(cursor, period));
    if (period === AnalyticsPeriod.DAILY) cursor.setDate(cursor.getDate() + 1);
    else if (period === AnalyticsPeriod.MONTHLY) cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setFullYear(cursor.getFullYear() + 1);
  }

  return [...new Set(keys)];
}

export function aggregateToSeries<T extends { createdAt: Date }>(
  rows: T[],
  period: AnalyticsPeriod,
  start: Date,
  end: Date,
  valueFn: (row: T) => number,
): { label: string; key: string; value: number }[] {
  const buckets = generateBuckets(start, end, period);
  const totals = new Map(buckets.map((k) => [k, 0]));

  for (const row of rows) {
    const key = bucketKey(row.createdAt, period);
    if (totals.has(key)) {
      totals.set(key, (totals.get(key) ?? 0) + valueFn(row));
    }
  }

  return buckets.map((key) => ({
    key,
    label: formatBucketLabel(key, period),
    value: totals.get(key) ?? 0,
  }));
}

export function countToSeries(
  rows: { createdAt: Date }[],
  period: AnalyticsPeriod,
  start: Date,
  end: Date,
): { label: string; key: string; value: number }[] {
  return aggregateToSeries(rows, period, start, end, () => 1);
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
