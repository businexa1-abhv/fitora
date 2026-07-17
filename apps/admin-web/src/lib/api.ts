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

export type AnalyticsSeriesPoint = { label: string; key: string; value: number };

export type AnalyticsDashboard = {
  period: string;
  range: { from: string; to: string };
  overview: {
    totalRevenue: number;
    totalBookings: number;
    newUsers: number;
    activeMemberships: number;
    shopOrders: number;
    activeCourts: number;
    pendingCourts: number;
  };
  revenue: {
    total: number;
    series: AnalyticsSeriesPoint[];
    byEntityType: Array<{
      entityType: string;
      label: string;
      revenue: number;
      count: number;
    }>;
  };
};

export type PaymentReports = {
  periodDays: number;
  summary: {
    totalTransactions: number;
    paidCount: number;
    failedCount: number;
    pendingCount: number;
    refundedCount: number;
    totalRevenue: number;
    refundedAmount: number;
    totalTax?: number;
  };
  byEntityType: Array<{
    entityType: string;
    label: string;
    count: number;
    revenue: number;
  }>;
};

export type PaymentRecord = {
  id: string;
  amount: number;
  status: string;
  entityType: string;
  createdAt: string;
  paidAt: string | null;
  user?: { id: string; firstName: string; lastName: string; email: string };
  invoiceNumber?: string | null;
};

export type Sport = {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  description: string | null;
};

export type SupportTicket = {
  id: string;
  subject: string;
  body: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  requesterEmail: string;
  requesterName: string;
  assignedToId: string | null;
  assignedTo?: { id: string; firstName: string; lastName: string; email: string } | null;
  tenantId: string | null;
  tenant?: { id: string; name: string; slug: string } | null;
  createdAt: string;
  updatedAt: string;
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

  getAnalyticsDashboard: (
    token: string,
    params?: { period?: string; from?: string; to?: string },
  ) => {
    const qs = new URLSearchParams();
    if (params?.period) qs.set('period', params.period);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiFetch<AnalyticsDashboard>(`/analytics/dashboard${suffix}`, {}, token);
  },

  getPaymentReports: (token: string, days?: number) => {
    const qs = days ? `?days=${days}` : '';
    return apiFetch<PaymentReports>(`/payments/admin/reports${qs}`, {}, token);
  },

  getPlatformFinanceReport: (token: string) =>
    apiFetch<{
      gmv: number;
      platformCommission: number;
      subscriptionRevenue: number;
      platformRevenue: number;
      activeOwners: number;
      pendingSettlements: number;
      failedPayouts: number;
      paymentCount: number;
      gmvByEntity: Record<string, number>;
    }>('/reports/platform', {}, token),

  listSettlements: (token: string) =>
    apiFetch<
      Array<{
        id: string;
        beneficiaryUserId: string;
        gross: number;
        commission: number;
        net: number;
        status: string;
        periodStart: string;
        periodEnd: string;
        paidAt: string | null;
        payoutStatus: string | null;
      }>
    >('/settlements', {}, token),

  processSettlements: (token: string) =>
    apiFetch<{ processed: number; settlements: Array<{ settlementId: string; net: number }> }>(
      '/settlements/process',
      { method: 'POST' },
      token,
    ),

  listPayments: (token: string, page?: number) => {
    const qs = page ? `?page=${page}` : '';
    return apiFetch<Paginated<PaymentRecord>>(`/payments/admin/list${qs}`, {}, token);
  },

  listSports: (token?: string) => apiFetch<Sport[]>(`/sports`, {}, token ?? undefined),

  listSupportTickets: (
    token: string,
    params?: { status?: string; search?: string; page?: number },
  ) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiFetch<Paginated<SupportTicket>>(`/admin/support/tickets${suffix}`, {}, token);
  },

  createSupportTicket: (
    token: string,
    body: {
      subject: string;
      body: string;
      requesterEmail: string;
      requesterName: string;
      tenantId?: string;
    },
  ) =>
    apiFetch<SupportTicket>(
      `/admin/support/tickets`,
      { method: 'POST', body: JSON.stringify(body) },
      token,
    ),

  updateSupportTicket: (
    token: string,
    id: string,
    body: { status?: string; assignedToId?: string | null; subject?: string; body?: string },
  ) =>
    apiFetch<SupportTicket>(
      `/admin/support/tickets/${id}`,
      { method: 'PATCH', body: JSON.stringify(body) },
      token,
    ),
};
