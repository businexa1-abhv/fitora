import type {
  Booking,
  BookingCheckoutResponse,
  Court,
  CourtSlot,
  MembershipPlan,
  PaginatedResponse,
  SportType,
  TrainingProgram,
} from '@fitora/shared';
import { apiFetch } from './api';

export function getCourts(params?: {
  city?: string;
  sportType?: SportType;
  search?: string;
  page?: number;
}) {
  const query = new URLSearchParams();
  if (params?.city) query.set('city', params.city);
  if (params?.sportType) query.set('sportSlug', params.sportType.toLowerCase().replace(/_/g, '-'));
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  const qs = query.toString();
  return apiFetch<PaginatedResponse<Court>>(`/courts${qs ? `?${qs}` : ''}`);
}

export function getCourt(id: string, token?: string) {
  return apiFetch<Court>(`/courts/${id}`, {}, token);
}

export function getCourtSlots(courtId: string, date: string) {
  return apiFetch<CourtSlot[]>(`/courts/${courtId}/slots?date=${date}`);
}

export function createBooking(token: string, courtId: string, slotId: string) {
  return apiFetch<BookingCheckoutResponse>(
    '/bookings',
    { method: 'POST', body: JSON.stringify({ courtId, slotId }) },
    token,
  );
}

export function joinWaitlist(token: string, courtId: string, slotId: string, seats = 1) {
  return apiFetch<{
    id: string;
    slotId: string;
    courtId: string;
    status: string;
    position: number;
    offeredUntil: string | null;
  }>(
    `/courts/${courtId}/slots/${slotId}/waitlist`,
    { method: 'POST', body: JSON.stringify({ seats }) },
    token,
  );
}

export function getMyWaitlist(token: string) {
  return apiFetch<
    Array<{
      id: string;
      slotId: string;
      courtId: string;
      status: string;
      position: number;
      offeredUntil: string | null;
      slot: { startTime: string; endTime: string };
      court: { name: string; city: string };
    }>
  >('/waitlist/my', {}, token);
}

export function getRefundPreview(token: string, bookingId: string) {
  return apiFetch<{
    refundPercent: number;
    refundAmount: number;
    policyLabel: string;
    hoursUntilSlot: number;
  }>(`/bookings/${bookingId}/refund-preview`, {}, token);
}

export function cancelBooking(token: string, bookingId: string, reason?: string) {
  return apiFetch<{
    booking: Booking;
    refundAmount: number;
    refundPercent: number;
    message: string;
  }>(`/bookings/${bookingId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }, token);
}

export function getMyBookings(token: string, page = 1, status?: string) {
  const query = new URLSearchParams({ page: String(page) });
  if (status) query.set('status', status);
  return apiFetch<PaginatedResponse<Booking>>(`/bookings/my?${query.toString()}`, {}, token);
}

export function getCourtMembershipPlans(courtId: string) {
  return apiFetch<MembershipPlan[]>(`/courts/${courtId}/memberships`);
}

export function getTrainingPrograms(courtId?: string) {
  const qs = courtId ? `?courtId=${courtId}` : '';
  return apiFetch<TrainingProgram[]>(`/training/programs${qs}`);
}
