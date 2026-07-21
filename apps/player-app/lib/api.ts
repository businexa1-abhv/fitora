import type { AuthResponse, CourtSlot } from '@fitora/shared';
import { clearAuthSession, getAccessToken, getRefreshToken, saveAuthSession } from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** Slot snapshot returned in 409 conflict bodies from the availability engine. */
export type ConflictSlotSnapshot = Partial<CourtSlot> & { id?: string };

export class ApiError extends Error {
  /** Machine-readable error code (e.g. SLOT_AVAILABILITY_CONFLICT). */
  code?: string;
  /** Latest slot snapshot when the booking conflicts (409). */
  slot?: ConflictSlotSnapshot;
  /** Alternative bookable slots suggested by the server (409). */
  nearbySlots?: ConflictSlotSnapshot[];
  /** Raw parsed response body, when available. */
  body?: unknown;

  constructor(
    message: string,
    public status: number,
    body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.body = body;
    if (body && typeof body === 'object') {
      const { code, slot, nearbySlots } = body as {
        code?: unknown;
        slot?: unknown;
        nearbySlots?: unknown;
      };
      if (typeof code === 'string') this.code = code;
      if (slot && typeof slot === 'object') this.slot = slot as ConflictSlotSnapshot;
      if (Array.isArray(nearbySlots)) this.nearbySlots = nearbySlots as ConflictSlotSnapshot[];
    }
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

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      await clearAuthSession();
      return null;
    }

    const data = (await response.json()) as AuthResponse;
    await saveAuthSession(data);
    return data.tokens.accessToken;
  } catch {
    await clearAuthSession();
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  const token = accessToken ?? (await getAccessToken());
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    const newToken = await (refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    }));
    if (newToken) {
      return apiFetch<T>(path, options, newToken, false);
    }
    throw new ApiError('Session expired. Please sign in again.', 401);
  }

  if (!response.ok) {
    let message = 'Something went wrong';
    let body: unknown;
    try {
      body = await response.json();
      message = getErrorMessage(body, message);
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(message, response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export { API_URL };
