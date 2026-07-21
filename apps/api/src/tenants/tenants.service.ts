import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TenantStatus, UserRole } from '@prisma/client';
import { AuthUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.module';
import { SlotEventsService } from '../realtime/slot-events.service';
import { TenantContextService } from './tenant-context.service';
import {
  CreateTenantDto,
  ResolveTenantQueryDto,
  UpdateTenantBrandingDto,
  UpdateTenantDto,
  UpdateTenantPaymentsDto,
  UpdateTenantStatusDto,
} from './dto/tenant.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function uniqueSlug(prisma: PrismaService, base: string): Promise<string> {
  let slug = base || 'tenant';
  for (let i = 0; i < 20; i++) {
    const exists = await prisma.tenant.findFirst({ where: { slug, deletedAt: null } });
    if (!exists) return slug;
    slug = `${base}-${i + 1}`;
  }
  return `${base}-${Date.now()}`;
}

const PUBLIC_TENANT_SELECT = {
  id: true,
  name: true,
  slug: true,
  customDomain: true,
  brandName: true,
  logoUrl: true,
  faviconUrl: true,
  primaryColor: true,
  secondaryColor: true,
  status: true,
  isActive: true,
} satisfies Prisma.TenantSelect;

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
    private slotEvents: SlotEventsService,
  ) {}

  async resolve(query: ResolveTenantQueryDto) {
    const where: Prisma.TenantWhereInput = { deletedAt: null, isActive: true };

    if (query.tenantId) where.id = query.tenantId;
    else if (query.slug) where.slug = query.slug;
    else if (query.domain) where.customDomain = query.domain.toLowerCase();
    else {
      throw new BadRequestException('Provide tenantId, slug, or domain');
    }

    const tenant = await this.prisma.tenant.findFirst({
      where,
      select: PUBLIC_TENANT_SELECT,
    });

    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async listForAdmin(params: { page?: number; pageSize?: number; status?: TenantStatus }) {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 100);
    const where: Prisma.TenantWhereInput = {
      deletedAt: null,
      ...(params.status && { status: params.status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          owner: { select: { id: true, email: true, firstName: true, lastName: true } },
          _count: {
            select: { courts: true, products: true, membershipPlans: true, trainers: true },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getById(id: string, user: AuthUserPayload) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { courts: true, products: true, membershipPlans: true, trainers: true } },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');
    this.assertTenantAccess(user, tenant.id, tenant.ownerId);
    return this.formatTenant(tenant, user);
  }

  async getMine(user: AuthUserPayload) {
    const tenant = await this.findPrimaryTenantForUser(user);
    if (!tenant) throw new NotFoundException('No tenant found for this user');
    return this.formatTenant(tenant, user);
  }

  async create(dto: CreateTenantDto, actor: AuthUserPayload) {
    const owner = await this.prisma.user.findFirst({
      where: { id: dto.ownerId, deletedAt: null },
    });
    if (!owner) throw new NotFoundException('Owner user not found');

    const baseSlug = slugify(dto.slug ?? dto.name);
    const slug = await uniqueSlug(this.prisma, baseSlug);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug,
        brandName: dto.brandName ?? dto.name,
        ownerId: dto.ownerId,
        customDomain: dto.customDomain,
        logoUrl: dto.logoUrl,
        faviconUrl: dto.faviconUrl,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        status: dto.status ?? TenantStatus.PENDING,
        members: {
          create: { userId: dto.ownerId, role: UserRole.COURT_OWNER },
        },
      },
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    void actor;
    return this.formatTenant(tenant, actor);
  }

  async createForCourtOwner(userId: string, name: string) {
    const existing = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });
    if (existing) return existing;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const baseSlug = slugify(name || user?.email?.split('@')[0] || 'tenant');
    const slug = await uniqueSlug(this.prisma, baseSlug);

    return this.prisma.tenant.create({
      data: {
        name: name || user?.firstName || 'My Organization',
        slug,
        brandName: name,
        ownerId: userId,
        status: TenantStatus.ACTIVE,
        members: { create: { userId, role: UserRole.COURT_OWNER } },
      },
    });
  }

  async update(id: string, dto: UpdateTenantDto, user: AuthUserPayload) {
    const tenant = await this.getTenantOrThrow(id);
    this.assertTenantManageAccess(user, tenant.id, tenant.ownerId);

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name,
        brandName: dto.brandName,
        customDomain: dto.customDomain,
        logoUrl: dto.logoUrl,
        faviconUrl: dto.faviconUrl,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        isActive: dto.isActive,
      },
    });

    return this.formatTenant(updated, user);
  }

  async updateBranding(id: string, dto: UpdateTenantBrandingDto, user: AuthUserPayload) {
    return this.update(id, dto, user);
  }

  async updatePayments(id: string, dto: UpdateTenantPaymentsDto, user: AuthUserPayload) {
    const tenant = await this.getTenantOrThrow(id);
    this.assertTenantManageAccess(user, tenant.id, tenant.ownerId);

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        useOwnPaymentAccount: dto.useOwnPaymentAccount ?? tenant.useOwnPaymentAccount,
        razorpayKeyId: dto.razorpayKeyId,
        razorpayKeySecret: dto.razorpayKeySecret,
        razorpayWebhookSecret: dto.razorpayWebhookSecret,
      },
    });

    return this.formatTenant(updated, user);
  }

  async updateStatus(id: string, dto: UpdateTenantStatusDto, user: AuthUserPayload) {
    if (!user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Only platform admins can change tenant status');
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { status: dto.status, isActive: dto.isActive },
    });

    await this.slotEvents.emitVenueUpdated({
      venueId: updated.id,
      tenantId: updated.id,
      name: updated.brandName ?? updated.name,
      status: updated.status,
      isActive: updated.isActive,
    });

    return this.formatTenant(updated, user);
  }

  async addTrainer(tenantId: string, trainerUserId: string, user: AuthUserPayload) {
    const tenant = await this.getTenantOrThrow(tenantId);
    this.assertTenantManageAccess(user, tenant.id, tenant.ownerId);

    return this.prisma.tenantTrainer.upsert({
      where: { tenantId_userId: { tenantId, userId: trainerUserId } },
      create: { tenantId, userId: trainerUserId },
      update: { isActive: true, deletedAt: null },
    });
  }

  async removeTrainer(tenantId: string, trainerUserId: string, user: AuthUserPayload) {
    const tenant = await this.getTenantOrThrow(tenantId);
    this.assertTenantManageAccess(user, tenant.id, tenant.ownerId);

    await this.prisma.tenantTrainer.updateMany({
      where: { tenantId, userId: trainerUserId, deletedAt: null },
      data: { isActive: false, deletedAt: new Date() },
    });

    return { success: true };
  }

  async listTrainers(tenantId: string, user: AuthUserPayload) {
    const tenant = await this.getTenantOrThrow(tenantId);
    this.assertTenantAccess(user, tenant.id, tenant.ownerId);

    return this.prisma.tenantTrainer.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            trainerProfile: true,
          },
        },
      },
    });
  }

  async getPaymentConfig(tenantId: string) {
    const tenant = await this.getTenantOrThrow(tenantId);
    if (tenant.useOwnPaymentAccount && tenant.razorpayKeyId && tenant.razorpayKeySecret) {
      return {
        mode: 'tenant' as const,
        keyId: tenant.razorpayKeyId,
        keySecret: tenant.razorpayKeySecret,
        webhookSecret: tenant.razorpayWebhookSecret,
      };
    }

    return {
      mode: 'platform' as const,
      keyId: process.env.RAZORPAY_KEY_ID ?? null,
      keySecret: process.env.RAZORPAY_KEY_SECRET ?? null,
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? null,
    };
  }

  resolveTenantIdFromContext(explicit?: string): string | undefined {
    if (explicit) return explicit;
    return this.tenantContext.getTenantId();
  }

  requireTenantScope(explicit?: string): string {
    const tenantId = this.resolveTenantIdFromContext(explicit);
    if (!tenantId) {
      throw new BadRequestException(
        'Tenant context required (X-Tenant-Id or X-Tenant-Slug header)',
      );
    }
    return tenantId;
  }

  withBypass<T>(fn: () => T): T {
    const current = this.tenantContext.get();
    if (!current) return fn();
    return this.tenantContext.run({ ...current, bypassIsolation: true }, fn);
  }

  private async getTenantOrThrow(id: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id, deletedAt: null } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  private async findPrimaryTenantForUser(user: AuthUserPayload) {
    if (user.roles.includes(UserRole.ADMIN) && this.tenantContext.getTenantId()) {
      return this.getTenantOrThrow(this.tenantContext.getTenantId()!);
    }

    return this.prisma.tenant.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id, isActive: true, deletedAt: null } } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private assertTenantAccess(user: AuthUserPayload, tenantId: string, ownerId: string) {
    if (user.roles.includes(UserRole.ADMIN)) return;
    if (user.id === ownerId) return;

    throw new ForbiddenException('You do not have access to this tenant');
  }

  private assertTenantManageAccess(user: AuthUserPayload, tenantId: string, ownerId: string) {
    if (user.roles.includes(UserRole.ADMIN)) return;
    if (user.id === ownerId) return;
    throw new ForbiddenException('You cannot manage this tenant');
  }

  private formatTenant(
    tenant: Prisma.TenantGetPayload<{ include?: { owner?: true } }>,
    user: AuthUserPayload,
  ) {
    const isAdmin = user.roles.includes(UserRole.ADMIN);
    const isOwner = user.id === tenant.ownerId;

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      customDomain: tenant.customDomain,
      brandName: tenant.brandName,
      logoUrl: tenant.logoUrl,
      faviconUrl: tenant.faviconUrl,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      status: tenant.status,
      isActive: tenant.isActive,
      useOwnPaymentAccount: tenant.useOwnPaymentAccount,
      ownerId: tenant.ownerId,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      ...(isAdmin || isOwner
        ? {
            razorpayKeyId: tenant.razorpayKeyId,
            hasRazorpaySecret: Boolean(tenant.razorpayKeySecret),
            hasWebhookSecret: Boolean(tenant.razorpayWebhookSecret),
          }
        : {}),
    };
  }
}
