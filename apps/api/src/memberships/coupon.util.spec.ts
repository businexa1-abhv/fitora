import { BadRequestException } from '@nestjs/common';
import {
  CouponAppliesTo,
  CouponCodeType,
  CouponDiscountType,
} from '@prisma/client';
import {
  calculateCouponDiscount,
  normalizeCouponCode,
  validateCouponRules,
} from './utils/coupon.util';

describe('coupon.util', () => {
  const baseCoupon = {
    id: 'c1',
    code: 'SAVE20',
    description: null,
    codeType: CouponCodeType.PROMO,
    courtId: 'court-1',
    companyName: null,
    createdById: null,
    discountType: CouponDiscountType.PERCENTAGE,
    discountValue: '20' as never,
    maxDiscount: null,
    minOrderAmount: null,
    appliesTo: CouponAppliesTo.MEMBERSHIP,
    usageLimit: 100,
    usageCount: 0,
    perUserLimit: 1,
    startsAt: null,
    expiresAt: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('normalizes coupon codes to uppercase', () => {
    expect(normalizeCouponCode(' save20 ')).toBe('SAVE20');
  });

  it('calculates percentage discount', () => {
    expect(
      calculateCouponDiscount(
        { discountType: CouponDiscountType.PERCENTAGE, discountValue: '20' as never, maxDiscount: null },
        1000,
      ),
    ).toBe(200);
  });

  it('validates active coupon', () => {
    const result = validateCouponRules(
      baseCoupon,
      {
        userId: 'u1',
        appliesTo: CouponAppliesTo.MEMBERSHIP,
        orderAmount: 1000,
        courtId: 'court-1',
      },
      0,
    );

    expect(result.discountAmount).toBe(200);
    expect(result.finalAmount).toBe(800);
  });

  it('rejects expired coupon', () => {
    expect(() =>
      validateCouponRules(
        { ...baseCoupon, expiresAt: new Date('2020-01-01') },
        { userId: 'u1', appliesTo: CouponAppliesTo.MEMBERSHIP, orderAmount: 1000 },
        0,
      ),
    ).toThrow(BadRequestException);
  });
});
