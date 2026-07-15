import type { Court, PaginatedResponse } from '@fitora/shared';
import { apiFetch } from './api';

export interface OwnerDashboard {
  period: string;
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
  courts: Array<{
    id: string;
    name: string;
    isApproved: boolean;
    approvalStatus: string;
    tenantId: string;
  }>;
}

export function getOwnerDashboard(token: string) {
  return apiFetch<OwnerDashboard>('/analytics/owner/dashboard?period=monthly', {}, token);
}

export function getMyCourts(token: string, page = 1) {
  return apiFetch<PaginatedResponse<Court>>(`/courts/mine?page=${page}&pageSize=50`, {}, token);
}
