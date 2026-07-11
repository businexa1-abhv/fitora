import { UserRole, type AuthUser } from '@fitora/shared';

export function isServiceProvider(user: AuthUser | null): boolean {
  if (!user) return false;
  return (
    user.roles.includes(UserRole.SERVICE_PROVIDER) ||
    user.roles.includes(UserRole.ADMIN)
  );
}
