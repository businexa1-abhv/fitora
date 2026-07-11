import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.module';
import { TenantContextService } from './tenant-context.service';

const PLATFORM_BASE_DOMAIN = process.env.PLATFORM_BASE_DOMAIN ?? 'fitora.com';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const headerTenantId = req.header('x-tenant-id')?.trim();
    const headerTenantSlug = req.header('x-tenant-slug')?.trim();
    const host = (req.header('x-forwarded-host') ?? req.header('host') ?? '').split(':')[0].toLowerCase();

    let tenantId = headerTenantId;
    let tenantSlug = headerTenantSlug;

    if (!tenantId && !tenantSlug && host) {
      const resolved = await this.resolveTenantFromHost(host);
      tenantId = resolved?.id;
      tenantSlug = resolved?.slug;
    }

    if (!tenantId && tenantSlug) {
      const tenant = await this.prisma.tenant.findFirst({
        where: { slug: tenantSlug, deletedAt: null, isActive: true },
        select: { id: true, slug: true },
      });
      tenantId = tenant?.id;
      tenantSlug = tenant?.slug;
    }

    if (!tenantId) {
      next();
      return;
    }

    (req as Request & { tenant?: { tenantId: string; tenantSlug?: string } }).tenant = {
      tenantId,
      tenantSlug,
    };

    this.tenantContext.run({ tenantId, tenantSlug }, () => next());
  }

  private async resolveTenantFromHost(host: string) {
    const custom = await this.prisma.tenant.findFirst({
      where: { customDomain: host, deletedAt: null, isActive: true },
      select: { id: true, slug: true },
    });
    if (custom) return custom;

    const suffix = `.${PLATFORM_BASE_DOMAIN}`;
    if (!host.endsWith(suffix) || host === PLATFORM_BASE_DOMAIN) {
      return null;
    }

    const subdomain = host.slice(0, -suffix.length).split('.').pop();
    if (!subdomain || ['www', 'api', 'admin'].includes(subdomain)) {
      return null;
    }

    return this.prisma.tenant.findFirst({
      where: { slug: subdomain, deletedAt: null, isActive: true },
      select: { id: true, slug: true },
    });
  }
}
