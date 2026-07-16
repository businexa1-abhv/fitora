import type { AuthResponse } from '@fitora/shared';
import { clearAuthSession, getAccessToken, getRefreshToken, saveAuthSession } from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

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
  if (!body || typeof body !== 'object') return fallback;
  const { message, error } = body as { message?: unknown; error?: unknown };
  if (Array.isArray(message)) {
    const messages = message.filter((item): item is string => typeof item === 'string');
    return messages.length > 0 ? messages.join(', ') : fallback;
  }
  if (typeof message === 'string' && message.length > 0) return message;
  if (typeof error === 'string' && error.length > 0) return error;
  return fallback;
}

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
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      `Cannot reach API at ${API_URL}. Start the API (pnpm dev:api) and use your Mac LAN IP for Expo Go.`,
      0,
    );
  }

  // Only attempt token refresh for authenticated calls — not for login/register 401s.
  const isAuthAttempt =
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/verify');

  if (response.status === 401 && retry && !isAuthAttempt) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiFetch<T>(path, options, refreshed, false);
    throw new ApiError('Session expired. Please sign in again.', 401);
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = { message: text };
    }
  }
  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(body, `Request failed (${response.status})`),
      response.status,
    );
  }
  return body as T;
}

export { API_URL };
