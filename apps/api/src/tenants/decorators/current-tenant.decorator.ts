import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentTenantPayload = {
  tenantId: string;
  tenantSlug?: string;
};

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentTenantPayload | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);
