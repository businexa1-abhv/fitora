import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { MembershipsService } from './memberships.service';
import { CouponsService } from './coupons.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.module';
import { SubscriptionService } from '../finance/subscription/subscription.service';
import { addMembershipDuration } from './constants/plan-benefits';
import { MembershipDuration } from '@prisma/client';

describe('MembershipsService', () => {
  let service: MembershipsService;
  let prisma: jest.Mocked<
    Pick<PrismaService, 'membershipPlan' | 'membershipPurchase' | 'court' | 'booking' | 'coupon'>
  >;
  let couponsService: jest.Mocked<
    Pick<CouponsService, 'resolveCoupon' | 'applyRedemption' | 'validateForUser'>
  >;
  let paymentsService: jest.Mocked<Pick<PaymentsService, 'createPaymentOrder'>>;

  const ownerUser = { id: 'owner-1', email: 'o@f.com', roles: [UserRole.COURT_OWNER] };

  beforeEach(async () => {
    prisma = {
      membershipPlan: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      membershipPurchase: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      court: { findUnique: jest.fn() },
      booking: { count: jest.fn() },
      coupon: { count: jest.fn() },
    } as unknown as typeof prisma;

    couponsService = {
      resolveCoupon: jest
        .fn()
        .mockResolvedValue({ coupon: null, discountAmount: 0, finalAmount: 999 }),
      applyRedemption: jest.fn(),
      validateForUser: jest.fn(),
    };

    paymentsService = {
      createPaymentOrder: jest.fn().mockResolvedValue({ paymentId: 'pay-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CouponsService, useValue: couponsService },
        { provide: PaymentsService, useValue: paymentsService },
        {
          provide: SubscriptionService,
          useValue: { assertTenantCanAcceptBookings: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(MembershipsService);
  });

  describe('createPlan', () => {
    it('creates plan with benefits', async () => {
      prisma.court.findUnique.mockResolvedValue({ id: 'court-1', ownerId: 'owner-1' } as never);
      prisma.membershipPlan.create.mockResolvedValue({
        id: 'plan-1',
        courtId: 'court-1',
        name: 'Monthly',
        description: null,
        duration: 'MONTHLY',
        price: '999',
        maxBookings: 10,
        benefits: { bookingDiscountPercent: 15 },
        isActive: true,
        court: { id: 'court-1', name: 'Arena', city: 'BLR' },
      } as never);

      const result = await service.createPlan(
        'court-1',
        {
          name: 'Monthly',
          duration: 'MONTHLY' as never,
          price: 999,
          maxBookings: 10,
          benefits: { bookingDiscountPercent: 15 },
        },
        ownerUser,
      );

      expect(result.name).toBe('Monthly');
      expect(result.benefits?.bookingDiscountPercent).toBe(15);
    });
  });

  describe('getActiveMembershipDiscount', () => {
    it('returns plan-based discount percent', async () => {
      prisma.membershipPurchase.findFirst.mockResolvedValue({
        userId: 'u1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-01-01'),
        plan: { courtId: 'court-1', maxBookings: null, benefits: { bookingDiscountPercent: 20 } },
      } as never);
      prisma.booking.count.mockResolvedValue(0);

      const discount = await service.getActiveMembershipDiscount('u1', 'court-1');
      expect(discount).toBe(0.2);
    });

    it('returns 0 when max bookings reached', async () => {
      prisma.membershipPurchase.findFirst.mockResolvedValue({
        userId: 'u1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-01-01'),
        plan: { courtId: 'court-1', maxBookings: 5, benefits: { bookingDiscountPercent: 20 } },
      } as never);
      prisma.booking.count.mockResolvedValue(5);

      const discount = await service.getActiveMembershipDiscount('u1', 'court-1');
      expect(discount).toBe(0);
    });
  });

  describe('purchase', () => {
    it('applies coupon discount on purchase', async () => {
      prisma.membershipPlan.findFirst.mockResolvedValue({
        id: 'plan-1',
        isActive: true,
        price: '1000',
        courtId: 'court-1',
        court: { isApproved: true },
      } as never);
      prisma.membershipPurchase.findFirst.mockResolvedValue(null);
      couponsService.resolveCoupon.mockResolvedValue({
        coupon: { id: 'coupon-1' } as never,
        discountAmount: 200,
        finalAmount: 800,
      });
      prisma.membershipPurchase.create.mockResolvedValue({
        id: 'purchase-1',
        userId: 'u1',
        planId: 'plan-1',
        amountPaid: '800',
        coupon: null,
        plan: {
          price: '1000',
          duration: 'MONTHLY',
          court: { id: 'court-1', name: 'A', city: 'BLR' },
          benefits: null,
        },
      } as never);

      await service.purchase({ planId: 'plan-1', couponCode: 'SAVE20' }, 'u1');

      expect(paymentsService.createPaymentOrder).toHaveBeenCalledWith(
        'u1',
        800,
        'MEMBERSHIP',
        'purchase-1',
      );
      expect(couponsService.applyRedemption).toHaveBeenCalled();
    });
  });

  describe('validateCoupon', () => {
    it('delegates to coupons service', async () => {
      couponsService.validateForUser.mockResolvedValue({
        valid: true,
        code: 'SAVE20',
        codeType: 'PROMO' as never,
        discountType: 'PERCENTAGE' as never,
        discountAmount: 20,
        finalAmount: 80,
        originalAmount: 100,
      });

      const result = await service.validateCoupon(
        { code: 'SAVE20', appliesTo: 'MEMBERSHIP', orderAmount: 100 },
        'u1',
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('getPlansByCourt', () => {
    it('returns active plans for court', async () => {
      prisma.membershipPlan.findMany.mockResolvedValue([
        {
          id: 'plan-1',
          name: 'Monthly',
          price: '999',
          duration: 'MONTHLY',
          isActive: true,
          court: { id: 'court-1', name: 'Arena', city: 'BLR' },
          benefits: null,
          maxBookings: null,
          description: null,
        },
      ] as never);

      const plans = await service.getPlansByCourt('court-1');
      expect(plans).toHaveLength(1);
      expect(plans[0].name).toBe('Monthly');
    });
  });
});

describe('plan-benefits', () => {
  it('adds membership duration correctly', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = addMembershipDuration(start, MembershipDuration.MONTHLY);
    expect(end.getMonth()).toBe(1);
  });
});
