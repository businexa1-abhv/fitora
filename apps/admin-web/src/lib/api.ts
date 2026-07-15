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

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(`Cannot reach API at ${API_URL}`, 0);
  }

  if (!response.ok) {
    let message = 'Something went wrong';
    try {
      const body = (await response.json()) as { message?: string | string[]; error?: string };
      if (Array.isArray(body.message)) message = body.message.join(', ');
      else if (typeof body.message === 'string') message = body.message;
      else if (typeof body.error === 'string') message = body.error;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
};

const AUTH_KEY = 'fitora.admin-web.auth';

export function saveAuthSession(session: AuthSession) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_KEY);
}

export function getAccessToken(): string | null {
  return getAuthSession()?.accessToken ?? null;
}

export type PartnerApplicationAdmin = {
  id: string;
  status: string;
  ownerName: string | null;
  businessName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  venueAddress: string | null;
  state: string | null;
  pincode: string | null;
  venue: Record<string, unknown> | null;
  sportsConfig: unknown;
  trainers: unknown;
  legal: Record<string, unknown> | null;
  visuals: Record<string, unknown> | null;
  submittedAt: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    status: string;
    isActive: boolean;
    _count?: { courts: number };
    courts?: Array<{
      id: string;
      name: string;
      city: string;
      approvalStatus: string;
      isActive: boolean;
      sport?: { name: string; slug: string };
    }>;
  } | null;
  courtsApproved?: number;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const adminApi = {
  login: (email: string, password: string) =>
    apiFetch<{
      user: AuthSession['user'];
      tokens: { accessToken: string; refreshToken: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  partnerStats: (token: string) =>
    apiFetch<{ pendingKyc: number; activeOwners: number; underReview: number; activated: number }>(
      '/admin/partner-applications/stats',
      {},
      token,
    ),

  listApplications: (
    token: string,
    params?: { status?: string; search?: string; page?: number },
  ) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiFetch<Paginated<PartnerApplicationAdmin>>(
      `/admin/partner-applications${suffix}`,
      {},
      token,
    );
  },

  getApplication: (token: string, id: string) =>
    apiFetch<PartnerApplicationAdmin>(`/admin/partner-applications/${id}`, {}, token),

  approveApplication: (token: string, id: string) =>
    apiFetch<PartnerApplicationAdmin>(
      `/admin/partner-applications/${id}/approve`,
      { method: 'POST' },
      token,
    ),

  rejectApplication: (token: string, id: string, reason?: string) =>
    apiFetch<PartnerApplicationAdmin>(
      `/admin/partner-applications/${id}/reject`,
      { method: 'POST', body: JSON.stringify({ reason }) },
      token,
    ),

  listTenants: (token: string, status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return apiFetch<{ items: Array<Record<string, unknown>>; total: number }>(
      `/tenants${qs}`,
      {},
      token,
    );
  },
};
