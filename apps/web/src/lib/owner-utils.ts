'use client';

import { UserRole } from '@fitora/shared';
import type { AuthUser } from '@fitora/shared';

export function isCourtOwner(user: AuthUser | null): boolean {
  if (!user) return false;
  return user.roles.includes(UserRole.COURT_OWNER) || user.roles.includes(UserRole.ADMIN);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}
