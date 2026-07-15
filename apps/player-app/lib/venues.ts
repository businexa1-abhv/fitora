import type { PaginatedResponse, SportType, Venue } from '@fitora/shared';
import { apiFetch } from './api';

export function getVenues(params?: {
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
  return apiFetch<PaginatedResponse<Venue>>(`/venues${qs ? `?${qs}` : ''}`);
}

export function getVenue(id: string) {
  return apiFetch<Venue>(`/venues/${id}`);
}
