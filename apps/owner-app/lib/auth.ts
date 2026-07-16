import type { AuthResponse, AuthUser } from '@fitora/shared';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'fitora_owner_access_token';
const REFRESH_TOKEN_KEY = 'fitora_owner_refresh_token';
const USER_KEY = 'fitora_owner_user';
const APP_MODE_KEY = 'fitora_owner_app_mode';

export type AppMode = 'owner' | 'coach';

export async function saveAuthSession(response: AuthResponse, appMode: AppMode = 'owner') {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.tokens.refreshToken);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));
  await SecureStore.setItemAsync(APP_MODE_KEY, appMode);
}

export async function clearAuthSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
    SecureStore.deleteItemAsync(APP_MODE_KEY),
  ]);
}

export async function getStoredAppMode(): Promise<AppMode> {
  const mode = await SecureStore.getItemAsync(APP_MODE_KEY);
  return mode === 'coach' ? 'coach' : 'owner';
}

export async function setStoredAppMode(mode: AppMode) {
  await SecureStore.setItemAsync(APP_MODE_KEY, mode);
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
