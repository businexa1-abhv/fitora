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

export interface AdminBookingRow {
  id: string;
  status: string;
  totalAmount: string;
  user?: { firstName: string; lastName: string; email: string };
  court: { name: string; city: string };
  slot: { startTime: string; endTime: string };
}

export function getAdminBookings(token: string, params?: ListQueryParams) {
  return apiFetch<PaginatedResponse<AdminBookingRow>>(
    `/bookings/admin/list${buildQuery(params)}`,
    {},
    token,
  );
}

export interface AdminMembershipRow {
  id: string;
  status: string;
  amountPaid: string;
  startDate: string;
  endDate: string;
  user?: { firstName: string; lastName: string; email: string };
  plan?: { name: string; court?: { name: string; city: string } };
}

export interface AdminMembershipsResponse extends PaginatedResponse<AdminMembershipRow> {
  stats: { activeCount: number; planCount: number; totalSubscriptions: number };
}

export function getAdminMemberships(token: string, params?: ListQueryParams) {
  return apiFetch<AdminMembershipsResponse>(
    `/memberships/admin/purchases${buildQuery(params)}`,
    {},
    token,
  );
}

export interface AdminServiceListingRow {
  id: string;
  title: string;
  category: string;
  city: string;
  price: string;
  isActive: boolean;
  orderCount?: number;
  provider?: { firstName: string; lastName: string };
}

export function getAdminServiceListings(token: string, params?: ListQueryParams) {
  return apiFetch<PaginatedResponse<AdminServiceListingRow>>(
    `/services/listings/admin/all${buildQuery(params)}`,
    {},
    token,
  );
}

export interface AdminPrintOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  quantity: number;
  user?: { firstName: string; lastName: string };
  listing?: { title: string };
}

export function getAdminPrintOrders(token: string, params?: ListQueryParams) {
  return apiFetch<PaginatedResponse<AdminPrintOrderRow>>(
    `/print/orders/admin/list${buildQuery(params)}`,
    {},
    token,
  );
}
