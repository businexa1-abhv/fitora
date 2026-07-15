import type { AuthResponse } from '@fitora/shared';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiFetch } from './api';

const DEVICE_ID_KEY = 'fitora_device_id';

interface MobileOtpAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  isNewUser?: boolean;
  requiresOnboarding?: boolean;
  user: AuthResponse['user'];
}

interface MobileAuthResponse extends AuthResponse {
  expiresIn: number;
  isNewUser: boolean;
  requiresOnboarding: boolean;
}

interface CompletePlayerOnboardingPayload {
  email: string;
  firstName: string;
  lastName?: string;
  city?: string;
  profileImage?: string;
  gender?: string;
  sports?: string[];
  notificationsEnabled?: boolean;
}

function splitPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const mobileNumber = digits.slice(-10);
  const countryCode = `+${digits.slice(0, -10) || '91'}`;

  return { countryCode, mobileNumber };
}

async function getOrCreateDeviceId() {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, generated);
  return generated;
}

export function sendOtp(phone: string) {
  return apiFetch<{ message: string; expiresIn: number }>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify(splitPhone(phone)),
  });
}

export async function loginWithPhone(phone: string, otp: string): Promise<MobileAuthResponse> {
  const os = [Device.osName, Device.osVersion].filter(Boolean).join(' ');

  const response = await apiFetch<MobileOtpAuthResponse>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      ...splitPhone(phone),
      otp,
      deviceId: await getOrCreateDeviceId(),
      deviceName: Device.deviceName ?? `${Platform.OS} device`,
      platform: Platform.OS,
      os: os || Platform.OS,
      appVersion: Constants.expoConfig?.version ?? 'development',
    }),
  });

  return {
    user: response.user,
    tokens: {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    },
    expiresIn: response.expiresIn,
    isNewUser: Boolean(response.isNewUser),
    requiresOnboarding: Boolean(response.requiresOnboarding),
  };
}

export async function completePlayerOnboarding(
  token: string,
  payload: CompletePlayerOnboardingPayload,
) {
  return apiFetch<AuthResponse['user']>(
    '/users/me/onboarding',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function registerWithOtp(payload: {
  phone: string;
  otp: string;
  email: string;
  firstName: string;
  lastName: string;
}) {
  return apiFetch<AuthResponse>('/auth/register/otp', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      purpose: 'REGISTER',
      role: 'PLAYER',
    }),
  });
}

export function refreshSession(refreshToken: string) {
  return apiFetch<AuthResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export function logout(refreshToken: string) {
  return apiFetch<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export function logoutAll(token: string) {
  return apiFetch<void>('/auth/logout/all', { method: 'POST' }, token);
}
