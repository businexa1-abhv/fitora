import { UserRole } from '@prisma/client';
import { Permission } from '@fitora/types';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  permissions: Permission[];
  phone?: string | null;
  avatarUrl?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
