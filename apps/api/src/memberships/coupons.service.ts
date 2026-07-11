import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Coupon,
  CouponAppliesTo,
  CouponCodeType,
  PaymentEntityType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { AuthUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.module';
import { TenantsService } from '../tenants/tenants.service';
import { CreateCouponDto, CouponQueryDto, UpdateCouponDto } from './dto/coupon.dto';
import {
  calculateCouponDiscount,
  normalizeCouponCode,
  validateCouponRules,
  type CouponValidationContext,
} from './utils/coupon.util';

@Injectable()
export class CouponsService {
  constructor(
    private prisma: PrismaService,
    private tenantsService: TenantsService,
  ) {}

  async create(dto: CreateCouponDto, user: AuthUserPayload) {
    if (dto.codeType === CouponCodeType.CORPORATE && !dto.companyName) {
      throw new BadRequestException('Corporate codes require a company name');
    }

    if (dto.courtId) {
      await this.assertCourtOwner(dto.courtId, user);
    } else if (!user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Only admins can create platform-wide coupons');
    }

    const code = normalizeCouponCode(dto.code);
    let tenantId: string | undefined = this.tenantsService.resolveTenantIdFromContext();

    if (dto.courtId) {
      const court = await this.prisma.court.findUnique({
        where: { id: dto.courtId },
        select: { tenantId: true },
      });
      tenantId = court?.tenantId;
    }

    const existing = await this.prisma.coupon.findFirst({
      where: { tenantId: tenantId ?? null, code, deletedAt: null },
    });
    if (existing) throw new BadRequestException('Coupon code already exists');

    return this.prisma.coupon.create({
      data: {
        tenantId,
        code,
        description: dto.description,
        codeType: dto.codeType,
        courtId: dto.courtId,
        companyName: dto.companyName,
        createdById: user.id,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxDiscount: dto.maxDiscount,
        minOrderAmount: dto.minOrderAmount,
        appliesTo: dto.appliesTo ?? CouponAppliesTo.MEMBERSHIP,
        usageLimit: dto.usageLimit,
        perUserLimit: dto.perUserLimit ?? 1,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      include: { court: { select: { id: true, name: true } } },
    });
  }

  async list(user: AuthUserPayload, query: CouponQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.CouponWhereInput = {
      deletedAt: null,
      ...(query.codeType && { codeType: query.codeType }),
      ...(query.courtId && { courtId: query.courtId }),
      ...(!user.roles.includes(UserRole.ADMIN) && {
        court: { ownerId: user.id },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        include: { court: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async update(couponId: string, dto: UpdateCouponDto, user: AuthUserPayload) {
    const coupon = await this.getCouponOrThrow(couponId);
    await this.assertCouponOwner(coupon, user);

    return this.prisma.coupon.update({
      where: { id: couponId },
      data: {
        ...dto,
        ...(dto.code && { code: normalizeCouponCode(dto.code) }),
        ...(dto.startsAt && { startsAt: new Date(dto.startsAt) }),
        ...(dto.expiresAt && { expiresAt: new Date(dto.expiresAt) }),
      },
      include: { court: { select: { id: true, name: true } } },
    });
  }

  async deactivate(couponId: string, user: AuthUserPayload) {
    const coupon = await this.getCouponOrThrow(couponId);
    await this.assertCouponOwner(coupon, user);

    return this.prisma.coupon.update({
      where: { id: couponId },
      data: { isActive: false },
    });
  }

  async validateForUser(code: string, ctx: CouponValidationContext) {
    const normalized = normalizeCouponCode(code);
    const coupon = await this.prisma.coupon.findFirst({
      where: { code: normalized, deletedAt: null },
    });

    if (!coupon) throw new BadRequestException('Invalid coupon code');

    const userRedemptionCount = await this.prisma.couponRedemption.count({
      where: { couponId: coupon.id, userId: ctx.userId },
    });

    const result = validateCouponRules(coupon, ctx, userRedemptionCount);

    return {
      valid: true,
      code: coupon.code,
      codeType: coupon.codeType,
      companyName: coupon.companyName,
      discountType: coupon.discountType,
      discountAmount: result.discountAmount,
      finalAmount: result.finalAmount,
      originalAmount: ctx.orderAmount,
    };
  }

  async applyRedemption(
    couponId: string,
    userId: string,
    entityType: PaymentEntityType,
    entityId: string,
    discountAmount: number,
  ) {
    await this.prisma.$transaction([
      this.prisma.coupon.update({
        where: { id: couponId },
        data: { usageCount: { increment: 1 } },
      }),
      this.prisma.couponRedemption.create({
        data: {
          couponId,
          userId,
          entityType,
          entityId,
          discountAmount,
        },
      }),
    ]);
  }

  async resolveCoupon(code: string | undefined, ctx: CouponValidationContext): Promise<{
    coupon: Coupon | null;
    discountAmount: number;
    finalAmount: number;
  }> {
    if (!code) {
      return { coupon: null, discountAmount: 0, finalAmount: ctx.orderAmount };
    }

    const validation = await this.validateForUser(code, ctx);
    const coupon = await this.prisma.coupon.findFirst({
      where: { code: normalizeCouponCode(code), deletedAt: null },
    });

    return {
      coupon: coupon!,
      discountAmount: validation.discountAmount,
      finalAmount: validation.finalAmount,
    };
  }

  private async getCouponOrThrow(id: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, deletedAt: null },
      include: { court: true },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  private async assertCourtOwner(courtId: string, user: AuthUserPayload) {
    const court = await this.prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new NotFoundException('Court not found');
    if (user.roles.includes(UserRole.ADMIN) || court.ownerId === user.id) return;
    throw new ForbiddenException('Insufficient permissions');
  }

  private async assertCouponOwner(
    coupon: { courtId: string | null; court?: { ownerId: string } | null },
    user: AuthUserPayload,
  ) {
    if (user.roles.includes(UserRole.ADMIN)) return;
    if (!coupon.courtId) {
      throw new ForbiddenException('Only admins can manage platform coupons');
    }
    if (coupon.court?.ownerId !== user.id) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
