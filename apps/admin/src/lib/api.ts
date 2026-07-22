import type { AuthResponse, AuthUser, Court } from '@fitora/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') {
    return fallback;
  }

  const { message, error } = body as { message?: unknown; error?: unknown };

  if (Array.isArray(message)) {
    const messages = message.filter((item): item is string => typeof item === 'string');
    return messages.length > 0 ? messages.join(', ') : fallback;
  }

  if (typeof message === 'string' && message.length > 0) {
    return message;
  }

  if (typeof error === 'string' && error.length > 0) {
    return error;
  }

  return fallback;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'Something went wrong';
    try {
      const body = await response.json();
      message = getErrorMessage(body, message);
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function login(email: string, password: string) {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getUsers(accessToken: string) {
  return apiFetch<AuthUser[]>('/users', {}, accessToken);
}

export interface PaginatedCourts {
  items: Court[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getPendingCourts(token: string) {
  const result = await apiFetch<PaginatedCourts>('/courts/pending', {}, token);
  return result.items;
}

export interface CourtListParams {
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  search?: string;
  page?: number;
  pageSize?: number;
}

export function getCourts(token: string, params: CourtListParams = {}) {
  const qs = new URLSearchParams();
  if (params.approvalStatus) qs.set('approvalStatus', params.approvalStatus);
  if (params.search) qs.set('search', params.search);
  qs.set('page', String(params.page ?? 1));
  qs.set('pageSize', String(params.pageSize ?? 20));
  return apiFetch<PaginatedCourts>(`/courts?${qs.toString()}`, {}, token);
}

export function approveCourt(token: string, courtId: string) {
  return apiFetch<Court>(`/courts/${courtId}/approve`, { method: 'PATCH' }, token);
}

export interface AdminVenueCourt {
  id: string;
  name: string;
  city: string;
  sport: { id: string; name: string; slug: string; iconUrl: string | null } | null;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  isActive: boolean;
  defaultSlotPrice: string | null;
  defaultSlotCapacity: number;
  owner: { id: string; firstName: string; lastName: string; email: string } | null;
}

export interface AdminVenue {
  id: string;
  name: string;
  brandName: string | null;
  slug: string;
  logoUrl: string | null;
  status: string;
  isActive: boolean;
  owner: { id: string; firstName: string; lastName: string; email: string } | null;
  city: string | null;
  courtCount: number;
  approvedCourtCount: number;
  pendingCourtCount: number;
  courts: AdminVenueCourt[];
}

export interface PaginatedAdminVenues {
  items: AdminVenue[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function getAdminVenues(
  token: string,
  params: { search?: string; page?: number; pageSize?: number } = {},
) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  qs.set('page', String(params.page ?? 1));
  qs.set('pageSize', String(params.pageSize ?? 20));
  return apiFetch<PaginatedAdminVenues>(`/venues/admin/list?${qs.toString()}`, {}, token);
}
