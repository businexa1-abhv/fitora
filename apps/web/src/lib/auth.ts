'use client';

import type { AuthResponse, AuthUser } from '@fitora/shared';

const ACCESS_TOKEN_KEY = 'fitora_access_token';
const REFRESH_TOKEN_KEY = 'fitora_refresh_token';
const USER_KEY = 'fitora_user';
export const AUTH_SESSION_CHANGED_EVENT = 'fitora-auth-session-changed';

function emitAuthSessionChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
  }
}

export function saveAuthSession(response: AuthResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, response.tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, response.tokens.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  emitAuthSessionChanged();
}

export function updateStoredUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  emitAuthSessionChanged();
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  emitAuthSessionChanged();
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function isAccessTokenExpired(accessToken: string): boolean {
  if (typeof window === 'undefined' || typeof window.atob !== 'function') return false;
  const payload = accessToken.split('.')[1];
  if (!payload) return false;

  try {
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const decoded = JSON.parse(window.atob(padded)) as { exp?: number };
    return typeof decoded.exp === 'number' && decoded.exp * 1000 <= Date.now() + 30_000;
  } catch {
    return false;
  }
}

export function getValidAccessToken(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  if (isAccessTokenExpired(token)) {
    clearAuthSession();
    return null;
  }
  return token;
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getUserInitials(user: AuthUser | null | undefined): string {
  if (!user) return '?';
  return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

export function getAdminAppUrl(): string {
  return process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3002';
}
