'use client';

import { getAccessToken } from '@/lib/auth';

export function useAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return getAccessToken();
}
