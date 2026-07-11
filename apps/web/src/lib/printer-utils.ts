'use client';

import { UserRole, type AuthUser } from '@fitora/shared';

export function isPrinter(user: AuthUser | null): boolean {
  if (!user) return false;
  return user.roles.includes(UserRole.PRINTER) || user.roles.includes(UserRole.ADMIN);
}

export function colorHex(name: string): string {
  const colors: Record<string, string> = {
    White: '#FFFFFF',
    Black: '#1a1a1a',
    Navy: '#1e3a5f',
    Red: '#c62828',
    'Royal Blue': '#1565c0',
    Grey: '#9e9e9e',
    Maroon: '#6d1b1b',
    Green: '#2e7d32',
  };
  return colors[name] ?? '#FFFFFF';
}
