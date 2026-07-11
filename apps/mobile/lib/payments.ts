import type { PaymentOrder } from '@fitora/shared';
import { apiFetch } from './api';

export function getPaymentConfig() {
  return apiFetch<{ mockMode: boolean; provider: string }>('/payments/config');
}

export async function completePayment(
  token: string,
  payment: PaymentOrder,
  _userEmail: string,
  _userName: string,
): Promise<unknown> {
  if (payment.isMock || payment.mockMode) {
    return apiFetch(
      '/payments/mock-complete',
      { method: 'POST', body: JSON.stringify({ paymentId: payment.paymentId }) },
      token,
    );
  }

  throw new Error(
    'Live Razorpay checkout is not configured in the mobile app. Enable PAYMENT_MODE=mock for development.',
  );
}

export function getMyPayments(token: string, page = 1) {
  return apiFetch(`/payments/my?page=${page}`, {}, token);
}
