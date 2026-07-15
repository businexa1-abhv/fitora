import type { Court, NotificationItem, PaginatedResponse, SportSummary } from '@fitora/shared';
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

export interface OwnerBookingRow {
  id: string;
  status: string;
  totalAmount?: string | number;
  court?: { id: string; name: string; city?: string };
  user?: { firstName?: string; lastName?: string };
  slot?: { startTime: string; endTime: string };
}

export interface CourtClosure {
  id: string;
  startDate: string;
  endDate: string;
  reason: 'BLOCKED' | 'MAINTENANCE' | 'HOLIDAY';
  title: string;
  notes?: string | null;
  isFullDay: boolean;
  startHour?: number | null;
  endHour?: number | null;
}

export interface CalendarDay {
  date: string;
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  blockedSlots: number;
  hasClosure: boolean;
  closures: Array<{ id: string; title: string; reason: string; isFullDay: boolean }>;
  slots: Array<{
    id: string;
    startTime: string;
    endTime: string;
    price: string | number;
    isBlocked: boolean;
    isBooked: boolean;
  }>;
}

export interface CreateCourtPayload {
  name: string;
  description?: string;
  sportId?: string;
  sportSlug?: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  amenities?: string[];
  rules?: string;
  defaultSlotPrice?: number;
  images?: Array<{ url: string; altText?: string; isPrimary?: boolean }>;
}

export type UpdateCourtPayload = Partial<CreateCourtPayload> & { isActive?: boolean };

export interface CreateClosurePayload {
  startDate: string;
  endDate: string;
  reason?: 'BLOCKED' | 'MAINTENANCE' | 'HOLIDAY';
  title: string;
  notes?: string;
  isFullDay?: boolean;
  startHour?: number;
  endHour?: number;
}

export function getOwnerDashboard(
  token: string,
  period: 'daily' | 'monthly' | 'yearly' = 'monthly',
) {
  return apiFetch<OwnerDashboard>(`/analytics/owner/dashboard?period=${period}`, {}, token);
}

export function getMyCourts(token: string, page = 1) {
  return apiFetch<PaginatedResponse<Court>>(`/courts/mine?page=${page}&pageSize=50`, {}, token);
}

export function getCourt(token: string, id: string) {
  return apiFetch<Court>(`/courts/${id}`, {}, token);
}

export function createCourt(token: string, payload: CreateCourtPayload) {
  return apiFetch<Court>('/courts', { method: 'POST', body: JSON.stringify(payload) }, token);
}

export function updateCourt(token: string, id: string, payload: UpdateCourtPayload) {
  return apiFetch<Court>(`/courts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
}

export function listSports(token?: string) {
  return apiFetch<SportSummary[]>('/sports', {}, token);
}

export function listAmenities(token?: string) {
  return apiFetch<string[]>('/courts/amenities', {}, token);
}

export function getOwnerBookings(token: string, page = 1) {
  return apiFetch<PaginatedResponse<OwnerBookingRow>>(
    `/bookings/owner/list?page=${page}&pageSize=50`,
    {},
    token,
  );
}

export function getCourtCalendar(
  token: string,
  courtId: string,
  startDate: string,
  endDate: string,
) {
  return apiFetch<{ startDate: string; endDate: string; days: CalendarDay[] }>(
    `/courts/${courtId}/slots/calendar?startDate=${startDate}&endDate=${endDate}`,
    {},
    token,
  );
}

export function listClosures(token: string, courtId: string) {
  return apiFetch<CourtClosure[]>(`/courts/${courtId}/closures`, {}, token);
}

export function createClosure(token: string, courtId: string, payload: CreateClosurePayload) {
  return apiFetch<CourtClosure>(
    `/courts/${courtId}/closures`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function removeClosure(token: string, courtId: string, closureId: string) {
  return apiFetch<{ success?: boolean }>(
    `/courts/${courtId}/closures/${closureId}`,
    { method: 'DELETE' },
    token,
  );
}

export function courtPrimaryImage(court: Court): string | null {
  const images = court.images ?? [];
  if (images.length === 0) return null;
  const primary = images.find((img) => typeof img !== 'string' && img.isPrimary);
  const first = primary ?? images[0];
  return typeof first === 'string' ? first : first.url;
}

export function listNotifications(token: string, page = 1) {
  return apiFetch<PaginatedResponse<NotificationItem>>(
    `/notifications?page=${page}&pageSize=30`,
    {},
    token,
  );
}

export function getUnreadNotificationCount(token: string) {
  return apiFetch<{ count: number }>('/notifications/unread-count', {}, token);
}

export function markNotificationRead(token: string, id: string) {
  return apiFetch<NotificationItem>(`/notifications/${id}/read`, { method: 'PATCH' }, token);
}

export function markAllNotificationsRead(token: string) {
  return apiFetch<{ success: boolean }>('/notifications/read-all', { method: 'POST' }, token);
}
