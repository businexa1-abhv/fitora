import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  CouponAppliesTo,
  CouponCodeType,
  CouponDiscountType,
  PaymentEntityType,
  UserRole,
} from '@prisma/client';
import { CouponsService } from './coupons.service';
import { PrismaService } from '../prisma/prisma.module';
import { asUser } from '../../test/helpers/auth.fixtures';

const baseCoupon = {
  id: 'coupon-1',
  code: 'SAVE10',
  description: '10% off',
  codeType: CouponCodeType.PROMO,
  courtId: null,
  companyName: null,
  createdById: 'admin-1',
  discountType: CouponDiscountType.PERCENTAGE,
  discountValue: 10,
  maxDiscount: null,
  minOrderAmount: null,
  appliesTo: CouponAppliesTo.SHOP_ORDER,
  usageLimit: 100,
  usageCount: 0,
  perUserLimit: 1,
  isActive: true,
  startsAt: null,
  expiresAt: new Date(Date.now() + 86400000),
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CouponsService', () => {
  let service: CouponsService;
  let prisma: jest.Mocked<
    Pick<
      PrismaService,
      'coupon' | 'couponRedemption' | 'court' | '$transaction'
    >
  >;

  beforeEach(async () => {
    prisma = {
      coupon: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      couponRedemption: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
      court: { findUnique: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    } as unknown as typeof prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [CouponsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CouponsService);
  });

  describe('create', () => {
    it('creates platform coupon as admin', async () => {
      prisma.coupon.findFirst.mockResolvedValue(null);
      prisma.coupon.create.mockResolvedValue({ ...baseCoupon, court: null } as never);

      const result = await service.create(
        {
          code: 'save10',
          discountType: CouponDiscountType.PERCENTAGE,
          discountValue: 10,
          codeType: CouponCodeType.PROMO,
        },
        asUser('admin'),
      );

      expect(result.code).toBe('SAVE10');
      expect(prisma.coupon.create).toHaveBeenCalled();
    });

    it('rejects corporate code without company name', async () => {
      await expect(
        service.create(
          {
            code: 'CORP',
            discountType: CouponDiscountType.FIXED,
            discountValue: 100,
            codeType: CouponCodeType.CORPORATE,
          },
          asUser('admin'),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('forbids non-admin platform coupon creation', async () => {
      await expect(
        service.create(
          {
            code: 'SAVE10',
            discountType: CouponDiscountType.PERCENTAGE,
            discountValue: 10,
            codeType: CouponCodeType.PROMO,
          },
          asUser('owner'),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows court owner to create court coupon', async () => {
      prisma.court.findUnique.mockResolvedValue({ id: 'court-1', ownerId: 'owner-1' } as never);
      prisma.coupon.findFirst.mockResolvedValue(null);
      prisma.coupon.create.mockResolvedValue({
        ...baseCoupon,
        courtId: 'court-1',
        court: { id: 'court-1', name: 'Arena' },
      } as never);

      const result = await service.create(
        {
          code: 'COURT10',
          discountType: CouponDiscountType.PERCENTAGE,
          discountValue: 10,
          codeType: CouponCodeType.PROMO,
          courtId: 'court-1',
        },
        asUser('owner'),
      );

      expect(result.courtId).toBe('court-1');
    });

    it('rejects duplicate coupon code', async () => {
      prisma.coupon.findFirst.mockResolvedValue(baseCoupon as never);

      await expect(
        service.create(
          {
            code: 'SAVE10',
            discountType: CouponDiscountType.PERCENTAGE,
            discountValue: 10,
            codeType: CouponCodeType.PROMO,
          },
          asUser('admin'),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('list', () => {
    it('lists coupons for admin', async () => {
      prisma.coupon.findMany.mockResolvedValue([baseCoupon] as never);
      prisma.coupon.count.mockResolvedValue(1);

      const result = await service.list(asUser('admin'), {});
      expect(result.items).toHaveLength(1);
      expect(result.totalPages).toBe(1);
    });

    it('filters by court owner for non-admin', async () => {
      prisma.coupon.findMany.mockResolvedValue([]);
      prisma.coupon.count.mockResolvedValue(0);

      await service.list(asUser('owner'), { page: 1, pageSize: 10 });
      expect(prisma.coupon.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ court: { ownerId: 'owner-1' } }),
        }),
      );
    });
  });

  describe('update and deactivate', () => {
    it('updates coupon when owner matches', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        ...baseCoupon,
        courtId: 'court-1',
        court: { ownerId: 'owner-1' },
      } as never);
      prisma.coupon.update.mockResolvedValue({ ...baseCoupon, description: 'Updated' } as never);

      const result = await service.update(
        'coupon-1',
        { description: 'Updated' },
        asUser('owner'),
      );
      expect(result.description).toBe('Updated');
    });

    it('deactivates coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue(baseCoupon as never);
      prisma.coupon.update.mockResolvedValue({ ...baseCoupon, isActive: false } as never);

      const result = await service.deactivate('coupon-1', asUser('admin'));
      expect(result.isActive).toBe(false);
    });

    it('throws when coupon not found', async () => {
      prisma.coupon.findFirst.mockResolvedValue(null);
      await expect(
        service.update('missing', {}, asUser('admin')),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('validateForUser', () => {
    it('validates active coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue(baseCoupon as never);
      prisma.couponRedemption.count.mockResolvedValue(0);

      const result = await service.validateForUser('save10', {
        userId: 'u1',
        orderAmount: 1000,
        appliesTo: CouponAppliesTo.SHOP_ORDER,
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(100);
      expect(result.finalAmount).toBe(900);
    });

    it('rejects invalid coupon code', async () => {
      prisma.coupon.findFirst.mockResolvedValue(null);
      await expect(
        service.validateForUser('BAD', {
          userId: 'u1',
          orderAmount: 500,
          appliesTo: CouponAppliesTo.SHOP_ORDER,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('resolveCoupon', () => {
    it('returns no discount when code omitted', async () => {
      const result = await service.resolveCoupon(undefined, {
        userId: 'u1',
        orderAmount: 500,
        appliesTo: CouponAppliesTo.SHOP_ORDER,
      });
      expect(result.discountAmount).toBe(0);
      expect(result.finalAmount).toBe(500);
    });

    it('resolves coupon with discount', async () => {
      prisma.coupon.findFirst.mockResolvedValue(baseCoupon as never);
      prisma.couponRedemption.count.mockResolvedValue(0);

      const result = await service.resolveCoupon('SAVE10', {
        userId: 'u1',
        orderAmount: 1000,
        appliesTo: CouponAppliesTo.SHOP_ORDER,
      });

      expect(result.coupon?.id).toBe('coupon-1');
      expect(result.discountAmount).toBe(100);
    });
  });

  describe('applyRedemption', () => {
    it('increments usage and creates redemption', async () => {
      await service.applyRedemption(
        'coupon-1',
        'u1',
        PaymentEntityType.SHOP_ORDER,
        'order-1',
        50,
      );
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
