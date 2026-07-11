import { UserRole } from '@prisma/client';
import type { AuthUserPayload } from '../../src/common/decorators';

export const TEST_USERS: Record<string, AuthUserPayload> = {
  player: {
    id: 'player-1',
    email: 'player@fitora.com',
    roles: [UserRole.PLAYER],
  },
  admin: {
    id: 'admin-1',
    email: 'admin@fitora.com',
    roles: [UserRole.ADMIN],
  },
  owner: {
    id: 'owner-1',
    email: 'owner@fitora.com',
    roles: [UserRole.COURT_OWNER],
  },
  provider: {
    id: 'provider-1',
    email: 'provider@fitora.com',
    roles: [UserRole.SERVICE_PROVIDER],
  },
};

export function asUser(role: keyof typeof TEST_USERS): AuthUserPayload {
  return TEST_USERS[role];
}
