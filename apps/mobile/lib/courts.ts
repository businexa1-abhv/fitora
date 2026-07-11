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
