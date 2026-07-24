import type {
  Court,
  NotificationItem,
  PaginatedResponse,
  PaymentOrder,
  SportSummary,
} from '@fitora/shared';
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
  paymentStatus?: string;
  totalAmount?: string | number;
  court?: { id: string; name: string; city?: string; sportType?: string };
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
  };
  slot?: { startTime: string; endTime: string; price?: string };
  bookingSource?: 'PLAYER_APP' | 'OWNER_WALK_IN';
  bookingType?: string;
  checkInCode?: string | null;
  createdAt?: string;
  notes?: string;
  seats?: number;
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
  maintenanceSlots?: number;
  occupancyPercent?: number;
  hasClosure: boolean;
  closures: Array<{ id: string; title: string; reason: string; isFullDay: boolean }>;
  slots: Array<{
    id: string;
    startTime: string;
    endTime: string;
    price: string | number;
    isBlocked: boolean;
    isBooked: boolean;
    capacity?: number;
    availableSeats?: number;
    reservedSeats?: number;
    confirmedSeats?: number;
    version?: number;
    operationalState?: SlotOperationalState;
    availabilityStatus?:
      | 'AVAILABLE'
      | 'FEW_SPOTS'
      | 'FULL'
      | 'BLOCKED'
      | 'MAINTENANCE'
      | 'TOURNAMENT'
      | 'PRIVATE'
      | 'CLOSED'
      | 'HOLIDAY';
  }>;
}

export type SlotOperationalState =
  'AVAILABLE' | 'BLOCKED' | 'MAINTENANCE' | 'TOURNAMENT' | 'PRIVATE' | 'CLOSED';

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

export async function exportOwnerReport(
  token: string,
  metric: string,
  period = 'monthly',
): Promise<string> {
  const qs = new URLSearchParams({ metric, period });
  const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
  const response = await fetch(`${API_URL}/analytics/owner/export?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Export failed');
  return response.text();
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

export async function listSports(token?: string) {
  const response = await apiFetch<SportSummary[] | { items?: SportSummary[] }>(
    '/sports',
    {},
    token,
  );
  if (Array.isArray(response)) return response;
  return Array.isArray(response?.items) ? response.items : [];
}

export async function listAmenities(token?: string) {
  const response = await apiFetch<{ items?: string[] } | string[]>('/courts/amenities', {}, token);
  if (Array.isArray(response)) return response;
  return Array.isArray(response?.items) ? response.items : [];
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

export interface VenueAvailabilitySummary {
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
  blockedSlots: number;
  maintenanceSlots: number;
  reservedSlots: number;
  occupancyPercent: number;
}

export function getVenueAvailability(token: string, venueId: string, date?: string) {
  const q = date ? `?date=${date}` : '';
  return apiFetch<{
    venueId: string;
    date: string;
    courts: Array<{ id: string; name: string }>;
    slots: Array<Record<string, unknown>>;
    summary?: VenueAvailabilitySummary;
  }>(`/venues/${venueId}/availability${q}`, {}, token);
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

// ─── Memberships ──────────────────────────────────────────────────────────────

export type MembershipDuration =
  'HOURLY' | 'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUAL';

export interface MembershipPlan {
  id: string;
  name: string;
  description?: string | null;
  duration: MembershipDuration;
  price: string | number;
  maxBookings?: number | null;
  benefits?: {
    bookingDiscountPercent?: number;
    priorityBooking?: boolean;
    freeGuestPasses?: number;
    perks?: string[];
  } | null;
  isActive?: boolean;
  courtId?: string;
}

export interface MembershipDashboard {
  totalPlans: number;
  activeSubscribers: number;
  totalRevenue: number;
  expiringSoon: number;
  promoCodesActive?: number;
  corporateCodesActive?: number;
}

export interface CreateMembershipPlanPayload {
  name: string;
  description?: string;
  duration: MembershipDuration;
  price: number;
  maxBookings?: number;
  benefits?: {
    bookingDiscountPercent?: number;
    priorityBooking?: boolean;
    freeGuestPasses?: number;
    perks?: string[];
  };
}

export function listMyMembershipPlans(token: string) {
  return apiFetch<MembershipPlan[] | { items?: MembershipPlan[] }>(
    '/memberships/plans/mine',
    {},
    token,
  ).then((r) => (Array.isArray(r) ? r : (r.items ?? [])));
}

export function createMembershipPlan(
  token: string,
  courtId: string,
  payload: CreateMembershipPlanPayload,
) {
  return apiFetch<MembershipPlan>(
    `/courts/${courtId}/memberships`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function updateMembershipPlan(
  token: string,
  planId: string,
  payload: Partial<CreateMembershipPlanPayload> & { isActive?: boolean },
) {
  return apiFetch<MembershipPlan>(
    `/memberships/plans/${planId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    token,
  );
}

export function deleteMembershipPlan(token: string, planId: string) {
  return apiFetch<{ success?: boolean }>(
    `/memberships/plans/${planId}`,
    { method: 'DELETE' },
    token,
  );
}

export function getMembershipDashboard(token: string, courtId?: string) {
  const q = courtId ? `?courtId=${courtId}` : '';
  return apiFetch<MembershipDashboard>(`/memberships/dashboard${q}`, {}, token);
}

// ─── Slot schedules & pricing ─────────────────────────────────────────────────

export interface SlotSchedule {
  id: string;
  name: string;
  daysOfWeek: number[];
  startHour: number;
  startMinute?: number;
  endHour: number;
  endMinute?: number;
  durationMinutes: number;
  basePrice: string | number;
  isActive?: boolean;
}

export interface PricingRule {
  id: string;
  type: 'PEAK' | 'WEEKEND' | 'HOLIDAY';
  name: string;
  multiplier?: number | null;
  fixedPrice?: string | number | null;
  startHour?: number | null;
  endHour?: number | null;
  daysOfWeek?: number[] | null;
  isActive?: boolean;
}

export function listSlotSchedules(token: string, courtId: string) {
  return apiFetch<SlotSchedule[] | { items?: SlotSchedule[] }>(
    `/courts/${courtId}/slot-schedules`,
    {},
    token,
  ).then((r) => (Array.isArray(r) ? r : (r.items ?? [])));
}

export function createSlotSchedule(
  token: string,
  courtId: string,
  payload: {
    name: string;
    daysOfWeek: number[];
    startHour: number;
    endHour: number;
    durationMinutes: number;
    basePrice: number;
    startMinute?: number;
    endMinute?: number;
  },
) {
  return apiFetch<SlotSchedule>(
    `/courts/${courtId}/slot-schedules`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function updateSlotSchedule(
  token: string,
  courtId: string,
  scheduleId: string,
  payload: Partial<SlotSchedule> & { isActive?: boolean },
) {
  return apiFetch<SlotSchedule>(
    `/courts/${courtId}/slot-schedules/${scheduleId}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    token,
  );
}

export function deleteSlotSchedule(token: string, courtId: string, scheduleId: string) {
  return apiFetch<{ success?: boolean }>(
    `/courts/${courtId}/slot-schedules/${scheduleId}`,
    { method: 'DELETE' },
    token,
  );
}

export function generateRecurringSlots(
  token: string,
  courtId: string,
  startDate: string,
  endDate: string,
  scheduleIds?: string[],
) {
  return apiFetch(
    `/courts/${courtId}/slots/recurring/generate`,
    { method: 'POST', body: JSON.stringify({ startDate, endDate, scheduleIds }) },
    token,
  );
}

export function listPricingRules(token: string, courtId: string) {
  return apiFetch<PricingRule[] | { items?: PricingRule[] }>(
    `/courts/${courtId}/pricing-rules`,
    {},
    token,
  ).then((r) => (Array.isArray(r) ? r : (r.items ?? [])));
}

export function createPricingRule(
  token: string,
  courtId: string,
  payload: {
    type: 'PEAK' | 'WEEKEND' | 'HOLIDAY';
    name: string;
    multiplier?: number;
    fixedPrice?: number;
    startHour?: number;
    endHour?: number;
    daysOfWeek?: number[];
  },
) {
  return apiFetch<PricingRule>(
    `/courts/${courtId}/pricing-rules`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function deletePricingRule(token: string, courtId: string, ruleId: string) {
  return apiFetch<{ success?: boolean }>(
    `/courts/${courtId}/pricing-rules/${ruleId}`,
    { method: 'DELETE' },
    token,
  );
}

export interface UpdateSlotPayload {
  price?: number;
  capacity?: number;
  isBlocked?: boolean;
  operationalState?: SlotOperationalState;
  notes?: string;
  expectedVersion?: number;
}

export interface SlotActionPayload {
  reason?: Exclude<SlotOperationalState, 'AVAILABLE'>;
  notes?: string;
  expectedVersion?: number;
}

export function updateSlot(
  token: string,
  courtId: string,
  slotId: string,
  payload: UpdateSlotPayload,
) {
  return apiFetch(
    `/courts/${courtId}/slots/${slotId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  );
}

export function blockSlot(token: string, slotId: string, payload: SlotActionPayload = {}) {
  return apiFetch(
    `/slots/${slotId}/block`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function unblockSlot(token: string, slotId: string, payload: SlotActionPayload = {}) {
  return apiFetch(
    `/slots/${slotId}/unblock`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function openSlot(token: string, slotId: string, payload: SlotActionPayload = {}) {
  return apiFetch(
    `/slots/${slotId}/open`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function closeSlot(token: string, slotId: string, payload: SlotActionPayload = {}) {
  return apiFetch(
    `/slots/${slotId}/close`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

// ─── Check-in ─────────────────────────────────────────────────────────────────

export function checkInBooking(token: string, bookingId: string, checkInCode: string) {
  return apiFetch(
    `/bookings/${bookingId}/check-in`,
    { method: 'POST', body: JSON.stringify({ checkInCode }) },
    token,
  );
}

export function createWalkInBooking(
  token: string,
  payload: {
    courtId: string;
    slotId: string;
    guestName: string;
    guestPhone: string;
    paymentMethod?: 'Cash' | 'UPI' | 'Card';
    equipmentFee?: number;
    notes?: string;
    seats?: number;
  },
) {
  return apiFetch<{
    booking: {
      id: string;
      status: string;
      totalAmount: string;
      checkInCode?: string | null;
      court?: { name?: string };
      slot?: { startTime: string; endTime: string };
    };
    payment: Record<string, unknown>;
    invoice: { id: string; invoiceNumber: string; total: string } | null;
    checkInCode: string;
    message: string;
  }>('/bookings/walk-in', { method: 'POST', body: JSON.stringify(payload) }, token);
}

export function cancelOwnerBooking(token: string, bookingId: string, reason?: string) {
  return apiFetch<{
    booking: { id: string; status: string };
    refundAmount: number;
    refundPercent: number;
    message: string;
  }>(`/bookings/${bookingId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }, token);
}

export function getBookingQr(token: string, bookingId: string) {
  return apiFetch<{
    bookingId: string;
    checkInCode: string;
    payload: string;
    qrCodeDataUrl: string;
  }>(`/bookings/${bookingId}/qr`, {}, token);
}

// ─── Booking search / detail ──────────────────────────────────────────────────

export interface BookingsFilterParams {
  page?: number;
  pageSize?: number;
  /** Single status or comma-separated list e.g. "CONFIRMED,PENDING" */
  status?: string;
  /** Search by player name, email, phone, or booking ID */
  search?: string;
  courtId?: string;
  /** ISO date YYYY-MM-DD */
  startDate?: string;
  /** ISO date YYYY-MM-DD */
  endDate?: string;
  bookingSource?: string;
  paymentStatus?: string;
}

export function getOwnerBookingsFiltered(token: string, params: BookingsFilterParams = {}) {
  const qs = new URLSearchParams();
  (Object.entries(params) as [string, string | number | undefined][]).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  return apiFetch<PaginatedResponse<OwnerBookingRow>>(
    `/bookings/owner/list?${qs.toString()}`,
    {},
    token,
  );
}

export function getBookingDetail(token: string, bookingId: string) {
  return apiFetch<OwnerBookingRow>(`/bookings/${bookingId}`, {}, token);
}

// ─── Tenant / people / finance / settings ─────────────────────────────────────

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  brandName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  customDomain?: string | null;
  status?: string;
  isActive?: boolean;
  useOwnPaymentAccount?: boolean;
  razorpayKeyId?: string | null;
  hasRazorpaySecret?: boolean;
  ownerId?: string;
}

export interface TenantTrainer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  trainerProfile?: {
    bio?: string | null;
    yearsExperience?: number | null;
    specializations?: string[];
    certifications?: string[];
    isVerified?: boolean;
    averageRating?: number | string | null;
  } | null;
}

export interface MembershipSubscriber {
  id: string;
  amountPaid?: string | number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  user?: { id: string; firstName?: string; lastName?: string; email?: string };
  coupon?: { code?: string } | null;
}

export interface CouponRow {
  id: string;
  code: string;
  description?: string | null;
  codeType: 'PROMO' | 'CORPORATE';
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string | number;
  usageCount?: number;
  usageLimit?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
  companyName?: string | null;
}

export interface NotifPreferences {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
}

export function getTenantMe(token: string) {
  return apiFetch<TenantInfo>('/tenants/me', {}, token);
}

export function updateTenant(
  token: string,
  id: string,
  payload: Partial<{ name: string; brandName: string; customDomain: string; isActive: boolean }>,
) {
  return apiFetch<TenantInfo>(
    `/tenants/${id}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  );
}

export function updateTenantBranding(
  token: string,
  id: string,
  payload: Partial<{
    logoUrl: string;
    faviconUrl: string;
    primaryColor: string;
    secondaryColor: string;
    brandName: string;
  }>,
) {
  return apiFetch<TenantInfo>(
    `/tenants/${id}/branding`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  );
}

export function updateTenantPayments(
  token: string,
  id: string,
  payload: Partial<{
    useOwnPaymentAccount: boolean;
    razorpayKeyId: string;
    razorpayKeySecret: string;
    razorpayWebhookSecret: string;
  }>,
) {
  return apiFetch<TenantInfo>(
    `/tenants/${id}/payments`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  );
}

export function listTenantTrainers(token: string, tenantId: string) {
  return apiFetch<TenantTrainer[] | { items?: TenantTrainer[] }>(
    `/tenants/${tenantId}/trainers`,
    {},
    token,
  ).then((r) => (Array.isArray(r) ? r : (r.items ?? [])));
}

export function listPlanSubscribers(token: string, planId: string) {
  return apiFetch<MembershipSubscriber[] | { items?: MembershipSubscriber[] }>(
    `/memberships/plans/${planId}/subscribers`,
    {},
    token,
  ).then((r) => (Array.isArray(r) ? r : (r.items ?? [])));
}

export function listCoupons(token: string, courtId?: string) {
  const q = courtId ? `?courtId=${courtId}` : '';
  return apiFetch<PaginatedResponse<CouponRow> | CouponRow[]>(
    `/memberships/coupons${q}`,
    {},
    token,
  ).then((r) => (Array.isArray(r) ? r : (r.items ?? [])));
}

export function createCoupon(
  token: string,
  payload: {
    code: string;
    codeType: 'PROMO' | 'CORPORATE';
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    description?: string;
    courtId?: string;
    companyName?: string;
    usageLimit?: number;
    expiresAt?: string;
  },
) {
  return apiFetch<CouponRow>(
    '/memberships/coupons',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function deactivateCoupon(token: string, id: string) {
  return apiFetch(`/memberships/coupons/${id}/deactivate`, { method: 'PATCH' }, token);
}

export function getAuthMe(token: string) {
  return apiFetch<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    avatarUrl?: string | null;
    roles?: string[];
    permissions?: string[];
  }>('/auth/me', {}, token);
}

export function updateOwnerProfile(
  token: string,
  payload: { firstName?: string; lastName?: string; phone?: string },
) {
  return apiFetch<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string | null;
  }>('/users/me', { method: 'PATCH', body: JSON.stringify(payload) }, token);
}

export function changePassword(token: string, currentPassword: string, newPassword: string) {
  return apiFetch<{ message?: string }>(
    '/auth/change-password',
    { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) },
    token,
  );
}

export function logoutAllDevices(token: string) {
  return apiFetch('/auth/logout/all', { method: 'POST' }, token);
}

export function getNotificationPreferences(token: string) {
  return apiFetch<NotifPreferences>('/notifications/preferences', {}, token);
}

export function updateNotificationPreferences(token: string, payload: NotifPreferences) {
  return apiFetch<NotifPreferences>(
    '/notifications/preferences',
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  );
}

// ─── Venue ops (P2) ──────────────────────────────────────────────────────────

export type VenueExpense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  notes?: string | null;
  paymentMethod?: 'Cash' | 'Card' | 'UPI' | null;
  receiptUrl?: string | null;
};

export type VenueSlotType = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  multiplier: number;
  color: string;
};

export type VenueStaffShift = {
  id: string;
  staffName: string;
  staffUserId?: string | null;
  role: 'Front Desk' | 'Coach' | 'Maintenance';
  date: string;
  startTime: string;
  endTime: string;
  area: string;
  notes?: string | null;
};

export type PayrollLineRow = {
  id: string;
  trainerId: string;
  sessions: number;
  ratePerSession: number;
  commission: number;
  status: 'PENDING' | 'PAID';
  paidAt?: string | null;
  trainer?: { id: string; firstName?: string; lastName?: string; email?: string };
};

export type PayrollPeriod = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  lines: PayrollLineRow[];
  totalCommission?: number;
};

export type CrmPlayerRow = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  bookingCount: number;
  lastBookingAt?: string | null;
  courtNames: string[];
};

export type CrmPlayerDetail = {
  user: { id: string; firstName: string; lastName: string; email: string; phone?: string | null };
  bookingCount: number;
  courtNames: string[];
  bookings: Array<{
    id: string;
    status: string;
    totalAmount?: string | number;
    court?: { name: string };
    slot?: { startTime: string; endTime: string };
  }>;
  memberships: Array<{
    id: string;
    isActive: boolean;
    endDate?: string | null;
    plan?: { name: string };
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    total: string | number;
    createdAt?: string;
  }>;
  notes: Array<{ id: string; title?: string | null; content: string; createdAt: string }>;
  profile?: {
    medicalNotes?: string | null;
    skillLevel?: string | null;
    skillNotes?: string | null;
  } | null;
  attendanceCount?: number;
};

export function listExpenses(token: string) {
  return apiFetch<VenueExpense[]>('/expenses', {}, token);
}

export function getExpense(token: string, id: string) {
  return apiFetch<VenueExpense>(`/expenses/${id}`, {}, token);
}

export function createExpense(
  token: string,
  payload: {
    title: string;
    category: string;
    amount: number;
    date: string;
    notes?: string;
    paymentMethod?: 'Cash' | 'Card' | 'UPI';
  },
) {
  return apiFetch<VenueExpense>(
    '/expenses',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function updateExpense(
  token: string,
  id: string,
  payload: Partial<{
    title: string;
    category: string;
    amount: number;
    date: string;
    notes: string;
    paymentMethod: 'Cash' | 'Card' | 'UPI';
  }>,
) {
  return apiFetch<VenueExpense>(
    `/expenses/${id}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    token,
  );
}

export function deleteExpenseApi(token: string, id: string) {
  return apiFetch(`/expenses/${id}`, { method: 'DELETE' }, token);
}

export function listSlotTypes(token: string) {
  return apiFetch<VenueSlotType[]>('/slot-types', {}, token);
}

export function createSlotType(
  token: string,
  payload: {
    name: string;
    description: string;
    durationMin: number;
    multiplier: number;
    color: string;
  },
) {
  return apiFetch<VenueSlotType>(
    '/slot-types',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function deleteSlotType(token: string, id: string) {
  return apiFetch(`/slot-types/${id}`, { method: 'DELETE' }, token);
}

export function listStaffShifts(token: string, from?: string, to?: string) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const qs = q.toString();
  return apiFetch<VenueStaffShift[]>(`/staff/shifts${qs ? `?${qs}` : ''}`, {}, token);
}

export function createStaffShift(
  token: string,
  payload: {
    staffName: string;
    role: VenueStaffShift['role'];
    date: string;
    startTime: string;
    endTime: string;
    area: string;
    notes?: string;
    staffUserId?: string;
  },
) {
  return apiFetch<VenueStaffShift>(
    '/staff/shifts',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function updateStaffShift(
  token: string,
  id: string,
  payload: Partial<{
    staffName: string;
    role: VenueStaffShift['role'];
    date: string;
    startTime: string;
    endTime: string;
    area: string;
    notes: string;
    staffUserId: string;
  }>,
) {
  return apiFetch<VenueStaffShift>(
    `/staff/shifts/${id}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    token,
  );
}

export function deleteStaffShiftApi(token: string, id: string) {
  return apiFetch(`/staff/shifts/${id}`, { method: 'DELETE' }, token);
}

export function getCurrentPayrollPeriod(token: string) {
  return apiFetch<PayrollPeriod>('/payroll/periods/current', {}, token);
}

export function regeneratePayrollPeriod(token: string, periodId: string) {
  return apiFetch<PayrollPeriod>(
    `/payroll/periods/${periodId}/generate`,
    { method: 'POST' },
    token,
  );
}

export function updatePayrollLineStatus(token: string, lineId: string, status: 'PENDING' | 'PAID') {
  return apiFetch<PayrollLineRow>(
    `/payroll/lines/${lineId}`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    token,
  );
}

export function listCrmPlayers(token: string, search?: string) {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch<CrmPlayerRow[]>(`/crm/players${q}`, {}, token);
}

export function getCrmPlayer(token: string, userId: string) {
  return apiFetch<CrmPlayerDetail>(`/crm/players/${userId}`, {}, token);
}

export function updateCrmPlayerProfile(
  token: string,
  userId: string,
  payload: { medicalNotes?: string; skillLevel?: string; skillNotes?: string },
) {
  return apiFetch(
    `/crm/players/${userId}/profile`,
    { method: 'PUT', body: JSON.stringify(payload) },
    token,
  );
}

export function createCrmPlayerNote(
  token: string,
  userId: string,
  payload: { title?: string; content: string; isPrivate?: boolean },
) {
  return apiFetch(
    `/crm/players/${userId}/notes`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function deleteCrmPlayerNote(token: string, userId: string, noteId: string) {
  return apiFetch(`/crm/players/${userId}/notes/${noteId}`, { method: 'DELETE' }, token);
}

// ─── Subscription ────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  durationDays: number;
  amount: number;
  gstRate: number;
  gst: number;
  total: number;
  features: Record<string, unknown>;
}

export interface OwnerSubscription {
  id: string;
  tenantId: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  graceEndsAt: string | null;
  autoRenew: boolean;
  plan: SubscriptionPlan;
}

export function getSubscriptionPlans(token: string): Promise<SubscriptionPlan[]> {
  return apiFetch('/subscriptions/plans', {}, token);
}

export function getMySubscription(token: string): Promise<OwnerSubscription | null> {
  return apiFetch<OwnerSubscription | null>('/subscriptions/my', {}, token).catch(() => null);
}

export function purchaseSubscription(
  token: string,
  planId: string,
  tenantId: string,
  autoRenew = false,
): Promise<{ subscription: OwnerSubscription; payment: PaymentOrder }> {
  return apiFetch<{ subscription: OwnerSubscription; payment: PaymentOrder }>(
    '/subscriptions/purchase',
    { method: 'POST', body: JSON.stringify({ planId, tenantId, autoRenew }) },
    token,
  );
}

// ─── Community Hub (owner) ───────────────────────────────────────────────────

export interface OwnerCommunityGroup {
  id: string;
  name: string;
  emoji: string | null;
  groupType: string;
  privacy: string;
  memberCount: number;
  city: string | null;
  lastActivityAt: string;
}

export function getOwnerCommunityGroups(token: string) {
  return apiFetch<OwnerCommunityGroup[]>('/community/groups/mine', {}, token);
}

export function createOwnerCommunityGroup(
  token: string,
  payload: {
    name: string;
    groupType: string;
    privacy?: string;
    skillLevel?: string;
    city?: string;
    description?: string;
    emoji?: string;
    tenantId?: string;
    maxPlayers?: number;
  },
) {
  return apiFetch<OwnerCommunityGroup>(
    '/community/owner/groups',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export function broadcastCommunityAnnouncement(
  token: string,
  groupId: string,
  payload: { type?: string; title: string; body: string },
) {
  return apiFetch(
    `/community/groups/${groupId}/announcements`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}
