import { UserRole, type AuthUser } from '@fitora/shared';

export function isTrainer(user: AuthUser | null): boolean {
  if (!user) return false;
  return user.roles.includes(UserRole.TRAINER) || user.roles.includes(UserRole.ADMIN);
}

export function todayString() {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}
