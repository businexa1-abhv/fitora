import type { AuthResponse, AuthUser } from '@fitora/shared';
import { apiFetch } from './api';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'fitora.deviceId';

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id =
    Device.osInternalBuildId ??
    Device.modelId ??
    `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

export function sendOtp(phone: string) {
  return apiFetch<{ message: string; expiresIn: number }>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export function verifyOtp(phone: string, otp: string, deviceId?: string) {
  return apiFetch<AuthResponse>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp, deviceId }),
  });
}

/** @deprecated Prefer sendOtp / verifyOtp player endpoints */
export function sendOtpLegacy(phone: string, purpose: 'LOGIN' | 'REGISTER' = 'LOGIN') {
  return apiFetch<{ message: string; expiresIn: number }>('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ phone, purpose }),
  });
}

export function loginWithPhone(phone: string, otp: string) {
  return apiFetch<AuthResponse>('/auth/login/phone', {
    method: 'POST',
    body: JSON.stringify({ phone, otp }),
  });
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

export function getMe(token: string) {
  return apiFetch<AuthUser>('/auth/me', {}, token);
}
