import type { AuthResponse, AuthUser } from '@fitora/shared';

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

export function register(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
}) {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getMe(accessToken: string) {
  return apiFetch<AuthUser>('/users/me', {}, accessToken);
}

export function getUsers(accessToken: string) {
  return apiFetch<AuthUser[]>('/users', {}, accessToken);
}

export { API_URL };
