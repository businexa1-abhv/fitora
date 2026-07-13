import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  BookingStatus,
  CouponAppliesTo,
  CouponCodeType,
  type MembershipDuration,
  PaymentEntityType,
  PaymentStatus,
  type Prisma,
  UserRole,
} from '@prisma/client';
import { type AuthUserPayload } from '../common/decorators/current-user.decorator';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.module';
import { CouponsService } from './coupons.service';
import {
  addMembershipDuration,
  DURATION_LABELS,
  getBookingDiscountPercent,
  parsePlanBenefits,
} from './constants/plan-benefits';
import {
  type CreateMembershipPlanDto,
  type MembershipDashboardQueryDto,
  type PurchaseMembershipDto,
  type RenewMembershipDto,
  type UpdateMembershipPlanDto,
  type ValidateCouponDto,
} from './dto';

const PLAN_INCLUDE = {
  court: { select: { id: true, name: true, city: true } },
} as const;

const PURCHASE_INCLUDE = {
  plan: { include: PLAN_INCLUDE },
  coupon: { select: { id: true, code: true, codeType: true, companyName: true } },
} as const;

@Injectable()
export class MembershipsService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
    @Inject(CouponsService) private couponsService: CouponsService,
  ) {}

  // ─── Plans ──────────────────────────────────────────────────────────────────

  async createPlan(courtId: string, dto: CreateMembershipPlanDto, user: AuthUserPayload) {
    const court = await this.prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new NotFoundException('Court not found');
    this.assertOwnerOrAdmin(court.ownerId, user);

    return this.formatPlan(
      await this.prisma.membershipPlan.create({
        data: {
          tenantId: court.tenantId,
          courtId,
          name: dto.name,
          description: dto.description,
          duration: dto.duration,
          price: dto.price,
          maxBookings: dto.maxBookings,
          benefits: dto.benefits ? (dto.benefits as Prisma.InputJsonValue) : undefined,
        },
        include: PLAN_INCLUDE,
      }),
    );
  }

  async getPlansByCourt(courtId: string) {
    const plans = await this.prisma.membershipPlan.findMany({
      where: { courtId, isActive: true, deletedAt: null },
      orderBy: { price: 'asc' },
    });
    return plans.map((p) => this.formatPlan(p));
  }

  async getMyPlans(userId: string) {
    const plans = await this.prisma.membershipPlan.findMany({
      where: { court: { ownerId: userId }, deletedAt: null },
      include: PLAN_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return plans.map((p) => this.formatPlan(p));
  }

  async getPlan(planId: string) {
    const plan = await this.prisma.membershipPlan.findFirst({
      where: { id: planId, deletedAt: null },
      include: PLAN_INCLUDE,
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.formatPlan(plan);
  }

  async updatePlan(planId: string, dto: UpdateMembershipPlanDto, user: AuthUserPayload) {
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id: planId },
      include: { court: true },
    });
    if (!plan || plan.deletedAt) throw new NotFoundException('Plan not found');
    this.assertOwnerOrAdmin(plan.court.ownerId, user);

    const updated = await this.prisma.membershipPlan.update({
      where: { id: planId },
      data: {
        name: dto.name,
        description: dto.description,
        duration: dto.duration,
        price: dto.price,
        maxBookings: dto.maxBookings,
        isActive: dto.isActive,
        benefits: dto.benefits ? (dto.benefits as Prisma.InputJsonValue) : undefined,
      },
      include: PLAN_INCLUDE,
    });

    return this.formatPlan(updated);
  }

  async deletePlan(planId: string, user: AuthUserPayload) {
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id: planId },
      include: { court: true },
    });
    if (!plan || plan.deletedAt) throw new NotFoundException('Plan not found');
    this.assertOwnerOrAdmin(plan.court.ownerId, user);

    await this.prisma.membershipPlan.update({
      where: { id: planId },
      data: { isActive: false, deletedAt: new Date() },
    });

    return { success: true, id: planId };
  }

  // ─── Purchase & renewal ─────────────────────────────────────────────────────

  async purchase(dto: PurchaseMembershipDto, userId: string) {
    const plan = await this.prisma.membershipPlan.findFirst({
      where: { id: dto.planId, deletedAt: null },
      include: { court: true },
    });

    if (!plan || !plan.isActive || !plan.court.isApproved) {
      throw new NotFoundException('Plan not found');
    }

    const existing = await this.getActivePurchase(userId, dto.planId);
    if (existing) {
      throw new ForbiddenException('You already have an active membership for this plan');
    }

    const orderAmount = Number(plan.price);
    const { coupon, discountAmount, finalAmount } = await this.couponsService.resolveCoupon(
      dto.couponCode,
      {
        userId,
        appliesTo: CouponAppliesTo.MEMBERSHIP,
        orderAmount,
        courtId: plan.courtId,
      },
    );

    const purchase = await this.prisma.membershipPurchase.create({
      data: {
        userId,
        planId: plan.id,
        couponId: coupon?.id,
        isActive: false,
        paymentStatus: PaymentStatus.PENDING,
        amountPaid: finalAmount,
        autoRenew: dto.autoRenew ?? false,
      },
      include: PURCHASE_INCLUDE,
    });

    const payment = await this.paymentsService.createPaymentOrder(
      userId,
      finalAmount,
      PaymentEntityType.MEMBERSHIP,
      purchase.id,
    );

    if (coupon && discountAmount > 0) {
      await this.couponsService.applyRedemption(
        coupon.id,
        userId,
        PaymentEntityType.MEMBERSHIP,
        purchase.id,
        discountAmount,
      );
    }

    return {
      membership: this.formatPurchase(purchase),
      payment,
      discount: discountAmount,
      originalPrice: orderAmount,
    };
  }

  async renew(purchaseId: string, dto: RenewMembershipDto, userId: string) {
    const previous = await this.prisma.membershipPurchase.findFirst({
      where: { id: purchaseId, userId, deletedAt: null },
      include: { plan: { include: { court: true } } },
    });

    if (!previous) throw new NotFoundException('Membership not found');
    if (!previous.plan.isActive) throw new BadRequestException('Plan is no longer available');

    const orderAmount = Number(previous.plan.price);
    const { coupon, discountAmount, finalAmount } = await this.couponsService.resolveCoupon(
      dto.couponCode,
      {
        userId,
        appliesTo: CouponAppliesTo.MEMBERSHIP,
        orderAmount,
        courtId: previous.plan.courtId,
      },
    );

    const purchase = await this.prisma.membershipPurchase.create({
      data: {
        userId,
        planId: previous.planId,
        couponId: coupon?.id,
        renewedFromId: previous.id,
        isActive: false,
        paymentStatus: PaymentStatus.PENDING,
        amountPaid: finalAmount,
        autoRenew: previous.autoRenew,
      },
      include: PURCHASE_INCLUDE,
    });

    const payment = await this.paymentsService.createPaymentOrder(
      userId,
      finalAmount,
      PaymentEntityType.MEMBERSHIP,
      purchase.id,
    );

    if (coupon && discountAmount > 0) {
      await this.couponsService.applyRedemption(
        coupon.id,
        userId,
        PaymentEntityType.MEMBERSHIP,
        purchase.id,
        discountAmount,
      );
    }

    return {
      membership: this.formatPurchase(purchase),
      payment,
      discount: discountAmount,
      renewedFrom: previous.id,
    };
  }

  async setAutoRenew(purchaseId: string, autoRenew: boolean, userId: string) {
    const purchase = await this.prisma.membershipPurchase.findFirst({
      where: { id: purchaseId, userId, deletedAt: null },
    });
    if (!purchase) throw new NotFoundException('Membership not found');

    const updated = await this.prisma.membershipPurchase.update({
      where: { id: purchaseId },
      data: { autoRenew },
      include: PURCHASE_INCLUDE,
    });

    return this.formatPurchase(updated);
  }

  // ─── Member views ───────────────────────────────────────────────────────────

  async getMyMemberships(userId: string, activeOnly = false) {
    const now = new Date();
    const purchases = await this.prisma.membershipPurchase.findMany({
      where: {
        userId,
        deletedAt: null,
        paymentStatus: PaymentStatus.PAID,
        ...(activeOnly && {
          isActive: true,
          endDate: { gt: now },
        }),
      },
      include: PURCHASE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return purchases.map((p) => this.formatPurchase(p));
  }

  async getUsage(purchaseId: string, user: AuthUserPayload) {
    const purchase = await this.prisma.membershipPurchase.findFirst({
      where: { id: purchaseId, deletedAt: null },
      include: { plan: { include: { court: true } } },
    });

    if (!purchase) throw new NotFoundException('Membership not found');
    if (purchase.userId !== user.id && !this.isAdminOrOwner(purchase.plan.court.ownerId, user)) {
      throw new ForbiddenException('Access denied');
    }

    const usage = await this.countMembershipBookings(purchase);
    const discountPercent = getBookingDiscountPercent(purchase.plan.benefits) * 100;
    const maxBookings = purchase.plan.maxBookings;

    return {
      purchaseId: purchase.id,
      bookingsUsed: usage,
      maxBookings,
      bookingsRemaining: maxBookings != null ? Math.max(0, maxBookings - usage) : null,
      discountPercent,
      benefits: parsePlanBenefits(purchase.plan.benefits),
      startDate: purchase.startDate?.toISOString() ?? null,
      endDate: purchase.endDate?.toISOString() ?? null,
      isActive: purchase.isActive && !!purchase.endDate && purchase.endDate > new Date(),
    };
  }

  // ─── Owner dashboard ─────────────────────────────────────────────────────────

  async getDashboard(user: AuthUserPayload, query: MembershipDashboardQueryDto) {
    const courtFilter: Prisma.MembershipPlanWhereInput = {
      deletedAt: null,
      court: {
        ownerId: user.id,
        ...(query.courtId && { id: query.courtId }),
      },
    };

    const now = new Date();
    const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [totalPlans, activeSubscribers, revenueAgg, expiringSoon, promoCodes, corporateCodes] =
      await Promise.all([
        this.prisma.membershipPlan.count({ where: courtFilter }),
        this.prisma.membershipPurchase.count({
          where: {
            isActive: true,
            paymentStatus: PaymentStatus.PAID,
            endDate: { gt: now },
            plan: courtFilter,
          },
        }),
        this.prisma.membershipPurchase.aggregate({
          where: { paymentStatus: PaymentStatus.PAID, plan: courtFilter },
          _sum: { amountPaid: true },
        }),
        this.prisma.membershipPurchase.count({
          where: {
            isActive: true,
            paymentStatus: PaymentStatus.PAID,
            endDate: { gt: now, lte: soon },
            plan: courtFilter,
          },
        }),
        this.prisma.coupon.count({
          where: {
            codeType: CouponCodeType.PROMO,
            isActive: true,
            deletedAt: null,
            court: { ownerId: user.id, ...(query.courtId && { id: query.courtId }) },
          },
        }),
        this.prisma.coupon.count({
          where: {
            codeType: CouponCodeType.CORPORATE,
            isActive: true,
            deletedAt: null,
            court: { ownerId: user.id, ...(query.courtId && { id: query.courtId }) },
          },
        }),
      ]);

    const plans = await this.prisma.membershipPlan.findMany({
      where: courtFilter,
      include: {
        court: { select: { id: true, name: true } },
        _count: {
          select: {
            purchases: {
              where: { isActive: true, paymentStatus: PaymentStatus.PAID, endDate: { gt: now } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      totalPlans,
      activeSubscribers,
      totalRevenue: Number(revenueAgg._sum.amountPaid ?? 0),
      expiringSoon,
      promoCodesActive: promoCodes,
      corporateCodesActive: corporateCodes,
      durationOptions: Object.entries(DURATION_LABELS).map(([value, label]) => ({ value, label })),
      topPlans: plans.map((p) => ({
        ...this.formatPlan(p),
        activeSubscribers: p._count.purchases,
      })),
    };
  }

  async getSubscribers(planId: string, user: AuthUserPayload) {
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id: planId },
      include: { court: true },
    });
    if (!plan || plan.deletedAt) throw new NotFoundException('Plan not found');
    this.assertOwnerOrAdmin(plan.court.ownerId, user);

    const subscribers = await this.prisma.membershipPurchase.findMany({
      where: { planId, paymentStatus: PaymentStatus.PAID, deletedAt: null },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        coupon: { select: { code: true, codeType: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscribers.map((s) => ({
      ...this.formatPurchase(s),
      user: s.user,
    }));
  }

  async adminListPurchases(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: 'ACTIVE' | 'EXPIRED' | 'ALL';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const now = new Date();
    const sortOrder = params?.sortOrder ?? 'desc';

    const where: Prisma.MembershipPurchaseWhereInput = {
      deletedAt: null,
      paymentStatus: PaymentStatus.PAID,
      ...(params?.status === 'ACTIVE' && {
        isActive: true,
        endDate: { gt: now },
      }),
      ...(params?.status === 'EXPIRED' && {
        OR: [{ isActive: false }, { endDate: { lte: now } }],
      }),
      ...(params?.search && {
        OR: [
          { user: { firstName: { contains: params.search, mode: 'insensitive' } } },
          { user: { lastName: { contains: params.search, mode: 'insensitive' } } },
          { user: { email: { contains: params.search, mode: 'insensitive' } } },
          { plan: { name: { contains: params.search, mode: 'insensitive' } } },
          { plan: { court: { name: { contains: params.search, mode: 'insensitive' } } } },
        ],
      }),
    };

    const [items, total, activeCount, planCount] = await Promise.all([
      this.prisma.membershipPurchase.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          plan: { include: { court: { select: { id: true, name: true, city: true } } } },
          coupon: { select: { code: true, codeType: true } },
        },
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.membershipPurchase.count({ where }),
      this.prisma.membershipPurchase.count({
        where: {
          deletedAt: null,
          paymentStatus: PaymentStatus.PAID,
          isActive: true,
          endDate: { gt: now },
        },
      }),
      this.prisma.membershipPlan.count({ where: { deletedAt: null, isActive: true } }),
    ]);

    return {
      items: items.map((s) => ({
        ...this.formatPurchase(s),
        user: s.user,
        status: s.isActive && s.endDate && s.endDate > now ? 'ACTIVE' : 'EXPIRED',
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats: { activeCount, planCount, totalSubscriptions: total },
    };
  }

  async validateCoupon(dto: ValidateCouponDto, userId: string) {
    const plan = dto.planId
      ? await this.prisma.membershipPlan.findUnique({ where: { id: dto.planId } })
      : null;

    return this.couponsService.validateForUser(dto.code, {
      userId,
      appliesTo: dto.appliesTo === 'BOOKING' ? CouponAppliesTo.BOOKING : CouponAppliesTo.MEMBERSHIP,
      orderAmount: dto.orderAmount,
      courtId: dto.courtId ?? plan?.courtId,
    });
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  async expireMemberships() {
    const now = new Date();
    const expired = await this.prisma.membershipPurchase.updateMany({
      where: {
        isActive: true,
        endDate: { lt: now },
        deletedAt: null,
      },
      data: { isActive: false },
    });

    return { expired: expired.count };
  }

  // ─── Booking integration ────────────────────────────────────────────────────

  async getActiveMembershipDiscount(userId: string, courtId: string): Promise<number> {
    const purchase = await this.getActivePurchaseForCourt(userId, courtId);
    if (!purchase) return 0;

    const usage = await this.countMembershipBookings(purchase);
    if (purchase.plan.maxBookings != null && usage >= purchase.plan.maxBookings) {
      return 0;
    }

    return getBookingDiscountPercent(purchase.plan.benefits);
  }

  async getMembershipDiscountDetails(userId: string, courtId: string) {
    const purchase = await this.getActivePurchaseForCourt(userId, courtId);
    if (!purchase) {
      return { discount: 0, purchaseId: null, bookingsRemaining: null };
    }

    const usage = await this.countMembershipBookings(purchase);
    const maxBookings = purchase.plan.maxBookings;
    const remaining = maxBookings != null ? Math.max(0, maxBookings - usage) : null;

    if (maxBookings != null && usage >= maxBookings) {
      return { discount: 0, purchaseId: purchase.id, bookingsRemaining: 0 };
    }

    return {
      discount: getBookingDiscountPercent(purchase.plan.benefits),
      purchaseId: purchase.id,
      bookingsRemaining: remaining,
      benefits: parsePlanBenefits(purchase.plan.benefits),
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async getActivePurchase(userId: string, planId: string) {
    return this.prisma.membershipPurchase.findFirst({
      where: {
        userId,
        planId,
        isActive: true,
        paymentStatus: PaymentStatus.PAID,
        endDate: { gt: new Date() },
        deletedAt: null,
      },
      include: { plan: true },
    });
  }

  private async getActivePurchaseForCourt(userId: string, courtId: string) {
    return this.prisma.membershipPurchase.findFirst({
      where: {
        userId,
        isActive: true,
        paymentStatus: PaymentStatus.PAID,
        endDate: { gt: new Date() },
        deletedAt: null,
        plan: { courtId, deletedAt: null },
      },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });
  }

  private async countMembershipBookings(purchase: {
    userId: string;
    startDate: Date | null;
    endDate: Date | null;
    plan: { courtId: string };
  }) {
    if (!purchase.startDate || !purchase.endDate) return 0;

    return this.prisma.booking.count({
      where: {
        userId: purchase.userId,
        courtId: purchase.plan.courtId,
        paymentStatus: PaymentStatus.PAID,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        createdAt: { gte: purchase.startDate, lte: purchase.endDate },
        deletedAt: null,
      },
    });
  }

  private formatPlan(plan: Record<string, unknown>) {
    const p = plan as {
      price: { toString(): string };
      benefits: unknown;
      duration: MembershipDuration;
      _count?: { purchases: number };
      [key: string]: unknown;
    };
    return {
      ...plan,
      price: p.price.toString(),
      benefits: parsePlanBenefits(p.benefits),
      durationLabel: DURATION_LABELS[p.duration],
    };
  }

  private formatPurchase(purchase: Record<string, unknown>) {
    const s = purchase as {
      amountPaid: { toString(): string };
      plan?: Record<string, unknown> & {
        price: { toString(): string };
        benefits: unknown;
        duration: MembershipDuration;
      };
      [key: string]: unknown;
    };
    return {
      ...purchase,
      amountPaid: s.amountPaid.toString(),
      plan: s.plan
        ? {
            ...s.plan,
            price: s.plan.price.toString(),
            benefits: parsePlanBenefits(s.plan.benefits),
            durationLabel: DURATION_LABELS[s.plan.duration],
          }
        : undefined,
    };
  }

  private assertOwnerOrAdmin(ownerId: string, user: AuthUserPayload) {
    if (user.roles.includes(UserRole.ADMIN) || user.id === ownerId) return;
    throw new ForbiddenException('Insufficient permissions');
  }

  private isAdminOrOwner(ownerId: string, user: AuthUserPayload) {
    return user.roles.includes(UserRole.ADMIN) || user.id === ownerId;
  }
}
