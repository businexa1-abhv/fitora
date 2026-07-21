import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembershipDuration, PaymentStatus, UserRole } from '@prisma/client';
import { MembershipsService } from './memberships.service';
import { CouponsService } from './coupons.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.module';
import { SubscriptionService } from '../finance/subscription/subscription.service';

describe('MembershipsService (extended)', () => {
  let service: MembershipsService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let couponsService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let paymentsService: any;

  const owner = { id: 'owner-1', email: 'o@f.com', roles: [UserRole.COURT_OWNER] };

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

  it('getPlan returns plan by id', async () => {
    prisma.membershipPlan.findFirst.mockResolvedValue({
      id: 'plan-1',
      name: 'Monthly',
      price: '999',
      duration: MembershipDuration.MONTHLY,
      court: { id: 'c1', name: 'Arena', city: 'BLR' },
      benefits: null,
      maxBookings: null,
      isActive: true,
      description: null,
      courtId: 'c1',
    } as never);

    const plan = await service.getPlan('plan-1');
    expect((plan as any).name).toBe('Monthly');
  });

  it('getPlan throws when not found', async () => {
    prisma.membershipPlan.findFirst.mockResolvedValue(null);
    await expect(service.getPlan('x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getMyMemberships returns purchases', async () => {
    prisma.membershipPurchase.findMany.mockResolvedValue([]);
    const result = await service.getMyMemberships('u1');
    expect(result).toEqual([]);
  });

  it('setAutoRenew updates purchase', async () => {
    prisma.membershipPurchase.findFirst.mockResolvedValue({
      id: 'purchase-1',
      userId: 'u1',
      isActive: true,
    } as never);
    prisma.membershipPurchase.update.mockResolvedValue({
      id: 'purchase-1',
      userId: 'u1',
      planId: 'plan-1',
      autoRenew: true,
      amountPaid: '999',
      isActive: true,
      paymentStatus: PaymentStatus.PAID,
      startDate: new Date(),
      endDate: new Date(),
      createdAt: new Date(),
      plan: {
        id: 'plan-1',
        name: 'Monthly',
        price: '999',
        duration: MembershipDuration.MONTHLY,
        court: { id: 'c1', name: 'Arena', city: 'BLR' },
        benefits: null,
        maxBookings: null,
        isActive: true,
        description: null,
        courtId: 'c1',
      },
    } as never);

    const result = await service.setAutoRenew('purchase-1', true, 'u1');
    expect((result as any).autoRenew).toBe(true);
  });

  it('deletePlan forbids non-owner', async () => {
    prisma.membershipPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      deletedAt: null,
      court: { ownerId: 'other' },
    } as never);

    await expect(
      service.deletePlan('plan-1', { id: 'u1', email: 'x@f.com', roles: [UserRole.PLAYER] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('expireMemberships deactivates expired', async () => {
    prisma.membershipPurchase.updateMany.mockResolvedValue({ count: 2 });
    const result = await service.expireMemberships();
    expect(result.expired).toBe(2);
  });

  it('getMembershipDiscountDetails returns discount info', async () => {
    prisma.membershipPurchase.findFirst.mockResolvedValue({
      id: 'p1',
      plan: { courtId: 'c1', maxBookings: 10, benefits: { bookingDiscountPercent: 15 } },
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-01-01'),
    } as never);
    prisma.booking.count.mockResolvedValue(2);

    const details = await service.getMembershipDiscountDetails('u1', 'c1');
    expect(details.discount).toBeGreaterThan(0);
  });
});
