import type { AuthResponse } from '@fitora/shared';
import { apiFetch } from './api';

export function sendOtp(phone: string, purpose: 'LOGIN' | 'REGISTER' = 'LOGIN') {
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
