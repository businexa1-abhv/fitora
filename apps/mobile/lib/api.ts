import type { AuthResponse } from '@fitora/shared';
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  saveAuthSession,
} from './auth';

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
    try {
      const body = await response.json();
      message = body.message ?? body.error ?? message;
      if (Array.isArray(body.message)) {
        message = body.message.join(', ');
      }
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

export { API_URL };
