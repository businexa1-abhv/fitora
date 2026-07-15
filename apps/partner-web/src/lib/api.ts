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
    throw new ApiError(
      `Cannot reach API at ${API_URL}. Is the API running, and is CORS allowing this origin?`,
      0,
    );
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

export type PartnerApplication = {
  id: string;
  status: string;
  currentStep: string;
  ownerName: string | null;
  businessName: string | null;
  phone: string | null;
  phoneVerified: boolean;
  email: string | null;
  city: string | null;
  venueAddress: string | null;
  state: string | null;
  pincode: string | null;
  venue: Record<string, unknown> | null;
  sportsConfig: { items?: SportConfigItem[] } | null;
  trainers: TrainerInput[] | null;
  legal: Record<string, unknown> | null;
  visuals: Record<string, unknown> | null;
  tenantId: string | null;
  submittedAt: string | null;
};

export type SportConfigItem = {
  sportSlug: string;
  courtCount: number;
  maxPlayers?: number;
  standardRate: number;
  memberRate?: number;
  slotIntervals?: number[];
};

export type TrainerInput = {
  fullName: string;
  specialization: string;
  yearsExperience?: number;
  mobile?: string;
  aadhaar?: string;
  photoUrl?: string;
};

export type SubmitResult = {
  application: PartnerApplication;
  tenantId: string;
  courtsCreated: number;
  generatedPassword?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
  tokens: { accessToken: string; refreshToken: string };
};

export const partnerApi = {
  createDraft: () => apiFetch<PartnerApplication>('/partner/onboarding', { method: 'POST' }),
  get: (id: string) => apiFetch<PartnerApplication>(`/partner/onboarding/${id}`),
  saveBusiness: (id: string, body: Record<string, unknown>) =>
    apiFetch<PartnerApplication>(`/partner/onboarding/${id}/business`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  sendOtp: (id: string) =>
    apiFetch<{ message: string; expiresIn: number; debugOtp?: string }>(
      `/partner/onboarding/${id}/otp/send`,
      { method: 'POST' },
    ),
  verifyOtp: (id: string, otp: string) =>
    apiFetch<PartnerApplication>(`/partner/onboarding/${id}/otp/verify`, {
      method: 'POST',
      body: JSON.stringify({ otp }),
    }),
  saveVenue: (id: string, body: Record<string, unknown>) =>
    apiFetch<PartnerApplication>(`/partner/onboarding/${id}/venue`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  saveSports: (id: string, body: { items: SportConfigItem[] }) =>
    apiFetch<PartnerApplication>(`/partner/onboarding/${id}/sports`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  saveTrainers: (id: string, trainers: TrainerInput[]) =>
    apiFetch<PartnerApplication>(`/partner/onboarding/${id}/trainers`, {
      method: 'PATCH',
      body: JSON.stringify({ trainers }),
    }),
  saveLegal: (id: string, body: Record<string, unknown>) =>
    apiFetch<PartnerApplication>(`/partner/onboarding/${id}/legal`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  saveVisuals: (id: string, body: Record<string, unknown>) =>
    apiFetch<PartnerApplication>(`/partner/onboarding/${id}/visuals`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  submit: (id: string, password?: string) =>
    apiFetch<SubmitResult>(`/partner/onboarding/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(password ? { password } : {}),
    }),
};

const APP_KEY = 'fitora.partner.applicationId';
const AUTH_KEY = 'fitora.partner.auth';

export function getStoredApplicationId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(APP_KEY);
}

export function setStoredApplicationId(id: string) {
  localStorage.setItem(APP_KEY, id);
}

export function saveAuthSession(result: SubmitResult) {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      user: result.user,
      generatedPassword: result.generatedPassword,
      tenantId: result.tenantId,
    }),
  );
}

export function getAuthSession(): {
  accessToken: string;
  user: SubmitResult['user'];
  generatedPassword?: string;
  tenantId?: string;
} | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      accessToken: string;
      user: SubmitResult['user'];
      generatedPassword?: string;
      tenantId?: string;
    };
  } catch {
    return null;
  }
}
