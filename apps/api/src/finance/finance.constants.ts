import { CommissionServiceType, PaymentEntityType } from '@prisma/client';

export const GST_RATE = 0.18;

export const LEDGER_ACCOUNTS = {
  CASH_RAZORPAY: 'CASH_RAZORPAY',
  OWNER_PAYABLE: 'OWNER_PAYABLE',
  PLATFORM_COMMISSION: 'PLATFORM_COMMISSION',
  PLATFORM_SUBSCRIPTION: 'PLATFORM_SUBSCRIPTION',
  GST_PAYABLE: 'GST_PAYABLE',
  COMMISSION_RECEIVABLE: 'COMMISSION_RECEIVABLE',
  REFUNDS: 'REFUNDS',
} as const;

export const DEFAULT_COMMISSION_RATES: Record<
  Exclude<CommissionServiceType, 'SUBSCRIPTION' | 'FEATURED' | 'OTHER'>,
  number
> = {
  BOOKING: 8,
  MEMBERSHIP: 3,
  TRAINING: 5,
  SHOP_ORDER: 12,
  SERVICE_ORDER: 10,
  PRINT_ORDER: 10,
};

export const PAYMENT_TO_COMMISSION: Partial<Record<PaymentEntityType, CommissionServiceType>> = {
  [PaymentEntityType.BOOKING]: CommissionServiceType.BOOKING,
  [PaymentEntityType.MEMBERSHIP]: CommissionServiceType.MEMBERSHIP,
  [PaymentEntityType.TRAINING]: CommissionServiceType.TRAINING,
  [PaymentEntityType.SHOP_ORDER]: CommissionServiceType.SHOP_ORDER,
  [PaymentEntityType.SERVICE_ORDER]: CommissionServiceType.SERVICE_ORDER,
  [PaymentEntityType.PRINT_ORDER]: CommissionServiceType.PRINT_ORDER,
};

export const SUBSCRIPTION_PLANS = [
  {
    code: 'MONTHLY' as const,
    name: 'Monthly',
    durationDays: 30,
    amount: 2999,
    sortOrder: 1,
  },
  {
    code: 'QUARTERLY' as const,
    name: 'Quarterly',
    durationDays: 90,
    amount: 7999,
    sortOrder: 2,
  },
  {
    code: 'HALF_YEARLY' as const,
    name: 'Half-Yearly',
    durationDays: 180,
    amount: 14999,
    sortOrder: 3,
  },
  {
    code: 'YEARLY' as const,
    name: 'Yearly',
    durationDays: 365,
    amount: 26999,
    sortOrder: 4,
  },
];

export const GRACE_PERIOD_DAYS = 3;
export const SUBSCRIPTION_WARN_DAYS = [7, 3] as const;
