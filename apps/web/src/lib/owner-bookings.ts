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
  user?: { firstName: string; lastName: string };
  court: { name: string; city: string };
  slot: { startTime: string; endTime: string };
}

export function getOwnerBookings(token: string, params?: ListQueryParams) {
  return apiFetch<PaginatedResponse<OwnerBookingRow>>(
    `/bookings/owner/list${buildQuery(params)}`,
    {},
    token,
  );
}
