import type { AnalyticsPeriod } from '@fitora/shared';
import { apiFetch } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export interface OwnerDashboard {
  stats: {
    revenueMtd: number;
    bookingsToday: number;
    bookingsMtd: number;
    activeCourts: number;
    pendingCourts: number;
    activeMembers: number;
  };
  revenueBreakdown: Array<{ source: string; amount: number; share: number }>;
  monthlyTrend: Array<{ month: string; amount: number }>;
  recentBookings: Array<{
    id: string;
    userName: string;
    courtName: string;
    time: string;
    amount: number;
    status: string;
  }>;
  courts: Array<{ id: string; name: string; isApproved: boolean }>;
}

export function getOwnerDashboard(
  token: string,
  params?: { period?: AnalyticsPeriod; from?: string; to?: string },
) {
  const query = new URLSearchParams();
  if (params?.period) query.set('period', params.period);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  const qs = query.toString();
  return apiFetch<OwnerDashboard>(`/analytics/owner/dashboard${qs ? `?${qs}` : ''}`, {}, token);
}

export async function exportOwnerReport(
  token: string,
  metric: string,
  params?: { period?: AnalyticsPeriod },
) {
  const query = new URLSearchParams({ metric });
  if (params?.period) query.set('period', params.period);
  const response = await fetch(`${API_URL}/analytics/owner/export?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Export failed');
  return response.blob();
}
