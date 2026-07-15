import type { AuthResponse, AuthUser } from '@fitora/shared';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'fitora_access_token';
const REFRESH_TOKEN_KEY = 'fitora_refresh_token';
const USER_KEY = 'fitora_user';

export async function saveAuthSession(response: AuthResponse) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.tokens.refreshToken);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));
}

export async function clearAuthSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getUserInitials(user: AuthUser | null): string {
  if (!user) return '?';
  return `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() || '?';
}
