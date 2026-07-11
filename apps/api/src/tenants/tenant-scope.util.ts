import { Prisma } from '@prisma/client';
import { TenantContextService } from './tenant-context.service';

/** Row-level filter for tenant-scoped models when isolation is active. */
export function tenantWhere(
  tenantContext: TenantContextService,
  explicitTenantId?: string,
): { tenantId: string } | Record<string, never> {
  if (tenantContext.isBypassed()) {
    return explicitTenantId ? { tenantId: explicitTenantId } : {};
  }

  const tenantId = explicitTenantId ?? tenantContext.getTenantId();
  return tenantId ? { tenantId } : {};
}

export function mergeTenantWhere<T extends Prisma.CourtWhereInput>(
  base: T,
  tenantContext: TenantContextService,
  explicitTenantId?: string,
): T {
  const scope = tenantWhere(tenantContext, explicitTenantId);
  if (!('tenantId' in scope)) return base;
  return { ...base, tenantId: scope.tenantId };
}
