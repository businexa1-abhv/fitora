'use client';

import type { AuthResponse, AuthUser } from '@fitora/shared';
import { UserRole } from '@fitora/shared';

const ACCESS_TOKEN_KEY = 'fitora_access_token';
const REFRESH_TOKEN_KEY = 'fitora_refresh_token';
const USER_KEY = 'fitora_user';

export function saveAuthSession(response: AuthResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, response.tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, response.tokens.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
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

export function isAdmin(user: AuthUser | null): boolean {
  return user?.roles.includes(UserRole.ADMIN) ?? false;
}
