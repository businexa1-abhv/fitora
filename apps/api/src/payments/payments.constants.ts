import { PaymentEntityType } from '@prisma/client';

export const PAYMENT_ENTITY_LABELS: Record<PaymentEntityType, string> = {
  BOOKING: 'Court Booking',
  MEMBERSHIP: 'Membership',
  TRAINING: 'Training Enrollment',
  SHOP_ORDER: 'Store Order',
  SERVICE_ORDER: 'Sports Service',
  PRINT_ORDER: 'T-Shirt Printing',
  WALLET_TOPUP: 'Wallet Top-up',
  OWNER_SUBSCRIPTION: 'Owner Subscription',
};

export function generatePaymentInvoiceNumber(paymentId: string): string {
  const suffix = paymentId.replace(/-/g, '').slice(0, 8).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `INV-${ts}-${suffix}`;
}
