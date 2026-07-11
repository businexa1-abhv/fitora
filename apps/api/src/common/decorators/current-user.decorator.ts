import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Permission } from '@fitora/types';

export interface AuthUserPayload {
  id: string;
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
