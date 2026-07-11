import { BadRequestException } from '@nestjs/common';
import {
  Coupon,
  CouponAppliesTo,
  CouponDiscountType,
  PaymentEntityType,
} from '@prisma/client';

export interface CouponValidationContext {
  userId: string;
  appliesTo: CouponAppliesTo;
  orderAmount: number;
  courtId?: string;
}

export interface CouponValidationResult {
  coupon: Coupon;
  discountAmount: number;
  finalAmount: number;
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function calculateCouponDiscount(
  coupon: Pick<Coupon, 'discountType' | 'discountValue' | 'maxDiscount'>,
  orderAmount: number,
): number {
  let discount = 0;

  if (coupon.discountType === CouponDiscountType.PERCENTAGE) {
    discount = orderAmount * (Number(coupon.discountValue) / 100);
    if (coupon.maxDiscount) {
      discount = Math.min(discount, Number(coupon.maxDiscount));
    }
  } else {
    discount = Number(coupon.discountValue);
  }

  discount = Math.round(discount * 100) / 100;
  return Math.min(discount, orderAmount);
}

export function validateCouponRules(
  coupon: Coupon & { redemptions?: { id: string }[] },
  ctx: CouponValidationContext,
  userRedemptionCount: number,
): CouponValidationResult {
  const now = new Date();
  const code = normalizeCouponCode(coupon.code);

  if (!coupon.isActive || coupon.deletedAt) {
    throw new BadRequestException(`Coupon ${code} is not active`);
  }

  if (coupon.startsAt && coupon.startsAt > now) {
    throw new BadRequestException(`Coupon ${code} is not yet valid`);
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new BadRequestException(`Coupon ${code} has expired`);
  }

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new BadRequestException(`Coupon ${code} usage limit reached`);
  }

  if (userRedemptionCount >= coupon.perUserLimit) {
    throw new BadRequestException(`You have already used coupon ${code}`);
  }

  if (
    coupon.appliesTo !== CouponAppliesTo.ALL &&
    coupon.appliesTo !== ctx.appliesTo
  ) {
    throw new BadRequestException(`Coupon ${code} cannot be applied to this purchase`);
  }

  if (coupon.courtId && ctx.courtId && coupon.courtId !== ctx.courtId) {
    throw new BadRequestException(`Coupon ${code} is not valid for this court`);
  }

  if (coupon.minOrderAmount && ctx.orderAmount < Number(coupon.minOrderAmount)) {
    throw new BadRequestException(
      `Minimum order amount for ${code} is ₹${coupon.minOrderAmount}`,
    );
  }

  const discountAmount = calculateCouponDiscount(coupon, ctx.orderAmount);
  const finalAmount = Math.round((ctx.orderAmount - discountAmount) * 100) / 100;

  return { coupon, discountAmount, finalAmount };
}

export function entityTypeToAppliesTo(entityType: PaymentEntityType): CouponAppliesTo {
  switch (entityType) {
    case PaymentEntityType.BOOKING:
      return CouponAppliesTo.BOOKING;
    case PaymentEntityType.MEMBERSHIP:
      return CouponAppliesTo.MEMBERSHIP;
    case PaymentEntityType.TRAINING:
      return CouponAppliesTo.TRAINING;
    case PaymentEntityType.SHOP_ORDER:
      return CouponAppliesTo.SHOP_ORDER;
    case PaymentEntityType.SERVICE_ORDER:
      return CouponAppliesTo.SERVICE_ORDER;
    case PaymentEntityType.PRINT_ORDER:
      return CouponAppliesTo.PRINT_ORDER;
    default:
      return CouponAppliesTo.ALL;
  }
}
