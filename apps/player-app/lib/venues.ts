import type { Court, CourtImage, PaginatedResponse, SportType, Venue } from '@fitora/shared';
import { apiFetch } from './api';

export interface VenueSport {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string | null;
  courtCount: number;
  priceFrom: string | null;
}

export interface VenueSportsResponse {
  venueId: string;
  sports: VenueSport[];
}

export interface VenueSportDetail {
  venueId: string;
  sport: { id: string; name: string; slug: string; iconUrl?: string | null };
  courtCount: number;
  availableCourts: number;
  availableSlotsToday: number;
  priceFrom: string | null;
  membershipAvailable: boolean;
  coachAvailable: boolean;
  operatingHours: { startHour: number; endHour: number; daysOfWeek: number[] } | null;
  courts: Array<
    Pick<Court, 'id' | 'name' | 'defaultSlotPrice' | 'amenities' | 'sport'> & {
      defaultSlotCapacity?: number | null;
      images: CourtImage[];
    }
  >;
}

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

export function getVenue(id: string, sportSlug?: string) {
  const qs = sportSlug ? `?sportSlug=${encodeURIComponent(sportSlug)}` : '';
  return apiFetch<Venue>(`/venues/${id}${qs}`);
}

export function getVenueSports(id: string) {
  return apiFetch<VenueSportsResponse>(`/venues/${id}/sports`);
}

export function getVenueSportDetail(id: string, sportSlug: string) {
  return apiFetch<VenueSportDetail>(`/venues/${id}/sports/${encodeURIComponent(sportSlug)}`);
}
