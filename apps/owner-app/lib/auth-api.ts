import type { AuthResponse } from '@fitora/shared';
import { apiFetch } from './api';

export function loginWithEmail(email: string, password: string) {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
}

export function logout(refreshToken: string) {
  return apiFetch<{ message: string }>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}
