import type { AnalyticsDashboard, AnalyticsExportMetric, AnalyticsPeriod } from '@fitora/shared';
import { apiFetch } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export function getAnalyticsDashboard(
  token: string,
  params?: { period?: AnalyticsPeriod; from?: string; to?: string },
) {
  const query = new URLSearchParams();
  if (params?.period) query.set('period', params.period);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  const qs = query.toString();
  return apiFetch<AnalyticsDashboard>(`/analytics/dashboard${qs ? `?${qs}` : ''}`, {}, token);
}

export async function exportAnalyticsCsv(
  token: string,
  metric: AnalyticsExportMetric,
  params?: { period?: AnalyticsPeriod; from?: string; to?: string },
) {
  const query = new URLSearchParams({ metric });
  if (params?.period) query.set('period', params.period);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);

  const response = await fetch(`${API_URL}/analytics/export?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  return response.blob();
}
