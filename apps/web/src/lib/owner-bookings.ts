import type { PaginatedResponse } from '@fitora/shared';
import { apiFetch } from './api';

export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

function buildQuery(params?: ListQueryParams) {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  if (params?.search) q.set('search', params.search);
  if (params?.status) q.set('status', params.status);
  if (params?.sortBy) q.set('sortBy', params.sortBy);
  if (params?.sortOrder) q.set('sortOrder', params.sortOrder);
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

export interface OwnerBookingRow {
  id: string;
  status: string;
  totalAmount: string;
  checkInCode?: string | null;
  checkedInAt?: string | null;
  courtId?: string;
  user?: { firstName: string; lastName: string; email?: string };
  court: { id?: string; name: string; city: string };
  slot: { startTime: string; endTime: string };
}

export function getOwnerBookings(token: string, params?: ListQueryParams) {
  return apiFetch<PaginatedResponse<OwnerBookingRow>>(
    `/bookings/owner/list${buildQuery(params)}`,
    {},
    token,
  );
}

export function checkInBooking(token: string, bookingId: string, checkInCode: string) {
  return apiFetch<{ booking: OwnerBookingRow; message: string }>(
    `/bookings/${bookingId}/check-in`,
    { method: 'POST', body: JSON.stringify({ checkInCode }) },
    token,
  );
}

export type ParsedCheckInPayload = { bookingId: string; checkInCode: string };

/** Parse QR / scanner payload: JSON, bookingId|code, or plain check-in code (code-only → null bookingId). */
export function parseCheckInPayload(
  raw: string,
): ParsedCheckInPayload | { checkInCode: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const data = JSON.parse(trimmed) as {
      type?: string;
      bookingId?: string;
      checkInCode?: string;
    };
    if (data.bookingId && data.checkInCode) {
      return { bookingId: data.bookingId, checkInCode: data.checkInCode };
    }
  } catch {
    // not JSON
  }

  if (trimmed.includes('|')) {
    const [bookingId, checkInCode] = trimmed.split('|');
    if (bookingId?.trim() && checkInCode?.trim()) {
      return { bookingId: bookingId.trim(), checkInCode: checkInCode.trim() };
    }
  }

  // Plain check-in code — caller must resolve bookingId via search/selection
  if (/^[A-Za-z0-9-]{4,12}$/.test(trimmed)) {
    return { checkInCode: trimmed.toUpperCase() };
  }

  return null;
}
