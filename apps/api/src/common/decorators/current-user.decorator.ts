import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type UserRole } from '@prisma/client';
import { type Permission } from '@fitora/types';

export interface AuthUserPayload {
  id: string;
  sessionId?: string;
  deviceId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: UserRole[];
  permissions?: Permission[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUserPayload => {
    return ctx.switchToHttp().getRequest().user;
  },
);
