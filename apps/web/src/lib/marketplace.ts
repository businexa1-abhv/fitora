import type {
  PaginatedResponse,
  ServiceCheckoutResponse,
  ServiceListing,
  ServiceOrder,
  ServiceProviderDashboard,
  ServiceReview,
} from '@fitora/shared';
import { apiFetch } from './api';

export function getListings(params?: {
  category?: string;
  sportSlug?: string;
  city?: string;
  search?: string;
  page?: number;
}) {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.sportSlug) query.set('sportSlug', params.sportSlug);
  if (params?.city) query.set('city', params.city);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));

  const qs = query.toString();
  return apiFetch<PaginatedResponse<ServiceListing>>(
    `/services/listings${qs ? `?${qs}` : ''}`,
  );
}

export function getListing(id: string) {
  return apiFetch<ServiceListing>(`/services/listings/${id}`);
}

export function getListingReviews(listingId: string) {
  return apiFetch<ServiceReview[]>(`/services/listings/${listingId}/reviews`);
}

export function getMyListings(token: string) {
  return apiFetch<ServiceListing[]>('/services/listings/mine/all', {}, token);
}

export function createListing(
  token: string,
  data: {
    category: string;
    title: string;
    description?: string;
    price: number;
    sportSlug?: string;
    city: string;
    turnaroundDays?: number;
  },
) {
  return apiFetch<ServiceListing>(
    '/services/listings',
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function updateListing(
  token: string,
  id: string,
  data: Partial<{
    title: string;
    description: string;
    price: number;
    turnaroundDays: number;
    isActive: boolean;
  }>,
) {
  return apiFetch<ServiceListing>(
    `/services/listings/${id}`,
    { method: 'PUT', body: JSON.stringify(data) },
    token,
  );
}

export function bookService(
  token: string,
  listingId: string,
  data: {
    pickupAddress: string;
    pickupPhone: string;
    pickupCity: string;
    customerNotes?: string;
    equipmentDetails?: string;
    rentalStartDate?: string;
    rentalEndDate?: string;
  },
) {
  return apiFetch<ServiceCheckoutResponse>(
    `/services/listings/${listingId}/book`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function createServiceReview(
  token: string,
  listingId: string,
  data: { rating: number; title?: string; comment?: string },
) {
  return apiFetch<ServiceReview>(
    `/services/listings/${listingId}/reviews`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );
}

export function getMyServiceOrders(token: string) {
  return apiFetch<ServiceOrder[]>('/services/orders/my', {}, token);
}

export function getProviderOrders(token: string) {
  return apiFetch<ServiceOrder[]>('/services/orders/provider/incoming', {}, token);
}

export function getProviderDashboard(token: string) {
  return apiFetch<ServiceProviderDashboard>('/services/dashboard/provider', {}, token);
}

export function updateOrderStatus(
  token: string,
  orderId: string,
  data: { status: string; providerNotes?: string; trackingReference?: string },
) {
  return apiFetch<ServiceOrder>(
    `/services/orders/${orderId}/status`,
    { method: 'PATCH', body: JSON.stringify(data) },
    token,
  );
}

/** @deprecated Use getMyServiceOrders */
export const getMyMarketplaceOrders = getMyServiceOrders;
