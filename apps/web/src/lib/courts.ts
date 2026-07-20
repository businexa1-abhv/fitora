import type {
  Booking,
  BookingCheckoutResponse,
  Court,
  CourtSlot,
  Membership,
  MembershipPlan,
  PaginatedResponse,
  SportType,
  TrainingProgram,
  KidProfile,
  TrainingBatch,
  AttendanceRecord,
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
  if (params?.sportType) query.set('sportType', params.sportType);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));

  const qs = query.toString();
  return apiFetch<PaginatedResponse<Court>>(`/courts${qs ? `?${qs}` : ''}`);
}

export function getCourt(id: string, token?: string) {
  return apiFetch<Court>(`/courts/${id}`, {}, token);
}

export function getMyCourts(token: string) {
  return apiFetch<Court[]>('/courts/mine', {}, token);
}

export function createCourt(
  token: string,
  data: {
    name: string;
    description?: string;
    sportType: string;
    address: string;
    city: string;
    amenities?: string[];
  },
) {
  return apiFetch<Court>('/courts', { method: 'POST', body: JSON.stringify(data) }, token);
}

export function getCourtSlots(courtId: string, date: string) {
  return apiFetch<CourtSlot[]>(`/courts/${courtId}/slots?date=${date}`);
}

export function generateSlots(
  token: string,
  courtId: string,
  data: {
    date: string;
    startHour: number;
    endHour: number;
    durationMinutes: number;
    price: number;
  },
) {
  return apiFetch<{ created: number; total: number }>(
    `/courts/${courtId}/slots/generate`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function createBooking(token: string, slotId: string) {
  return apiFetch<BookingCheckoutResponse>(
    '/bookings',
    { method: 'POST', body: JSON.stringify({ slotId }) },
    token,
  );
}

export function getMyBookings(token: string) {
  return apiFetch<Booking[]>('/bookings/my', {}, token);
}

export function getCourtBookings(token: string, courtId: string) {
  return apiFetch<Booking[]>(`/courts/${courtId}/bookings`, {}, token);
}

export function getMyMembershipPlans(token: string) {
  return apiFetch<MembershipPlan[]>('/memberships/plans/mine', {}, token);
}

export function updateCourt(
  token: string,
  courtId: string,
  data: Partial<{
    name: string;
    description: string;
    address: string;
    city: string;
    amenities: string[];
    isActive: boolean;
  }>,
) {
  return apiFetch<Court>(
    `/courts/${courtId}`,
    { method: 'PUT', body: JSON.stringify(data) },
    token,
  );
}

export function getTrainers() {
  return apiFetch<{ id: string; firstName: string; lastName: string; email: string }[]>(
    '/training/trainers',
  );
}

export function approveCourt(token: string, courtId: string) {
  return apiFetch<Court>(`/courts/${courtId}/approve`, { method: 'PATCH' }, token);
}

export function getPendingCourts(token: string) {
  return apiFetch<Court[]>('/courts/pending', {}, token);
}

export function getMembershipPlans(courtId: string) {
  return apiFetch<MembershipPlan[]>(`/courts/${courtId}/memberships`);
}

export function getMyMemberships(token: string) {
  return apiFetch<Membership[]>('/memberships/my', {}, token);
}

export function purchaseMembership(token: string, planId: string) {
  return apiFetch<{ membership: Membership; payment: import('@fitora/shared').PaymentOrder }>(
    '/memberships/purchase',
    { method: 'POST', body: JSON.stringify({ planId }) },
    token,
  );
}

export function createMembershipPlan(
  token: string,
  courtId: string,
  data: { name: string; description?: string; duration: string; price: number },
) {
  return apiFetch<MembershipPlan>(
    `/courts/${courtId}/memberships`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function getTrainingPrograms(courtId?: string) {
  const qs = courtId ? `?courtId=${courtId}` : '';
  return apiFetch<TrainingProgram[]>(`/training/programs${qs}`);
}

export function getMyKids(token: string) {
  return apiFetch<KidProfile[]>('/training/kids/mine', {}, token);
}

export function enrollKidNew(
  token: string,
  data: {
    batchId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender?: string;
    school?: string;
    medicalNotes?: string;
    emergencyContact: string;
    emergencyPhone: string;
  },
) {
  return apiFetch<{
    enrollment: unknown;
    payment: import('@fitora/shared').PaymentOrder;
    fee: string;
  }>('/training/enroll/new', { method: 'POST', body: JSON.stringify(data) }, token);
}

export function getTrainerBatches(token: string) {
  return apiFetch<TrainingBatch[]>('/training/batches/mine', {}, token);
}

export function markAttendance(
  token: string,
  enrollmentId: string,
  data: { date: string; present: boolean; notes?: string },
) {
  return apiFetch<AttendanceRecord>(
    `/training/enrollments/${enrollmentId}/attendance`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function createTrainingProgram(
  token: string,
  courtId: string,
  data: {
    name: string;
    description?: string;
    sportType: string;
    minAge: number;
    maxAge: number;
    fee: number;
  },
) {
  return apiFetch<TrainingProgram>(
    `/courts/${courtId}/training/programs`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function createTrainingBatch(
  token: string,
  programId: string,
  data: { name: string; schedule: string; trainerId: string; maxCapacity?: number },
) {
  return apiFetch<TrainingBatch>(
    `/training/programs/${programId}/batches`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export interface RefundPreview {
  refundAmount: number;
  refundPercent: number;
  hoursUntilSlot: number;
  policy: string;
  originalAmount: number;
}

export function getRefundPreview(token: string, bookingId: string) {
  return apiFetch<RefundPreview>(`/bookings/${bookingId}/refund-preview`, {}, token);
}

export function cancelBooking(token: string, bookingId: string, reason?: string) {
  return apiFetch<{ booking: Booking; refundAmount: number }>(
    `/bookings/${bookingId}/cancel`,
    { method: 'POST', body: JSON.stringify({ reason: reason ?? 'Cancelled by player' }) },
    token,
  );
}
