import type { PaymentOrder } from '@fitora/shared';
import { apiFetch } from './api';

export async function completeOwnerPayment(
  token: string,
  payment: PaymentOrder,
  userEmail: string,
  userName: string,
  description: string,
): Promise<unknown> {
  if (payment.isMock || payment.mockMode) {
    return apiFetch(
      '/payments/mock-complete',
      { method: 'POST', body: JSON.stringify({ paymentId: payment.paymentId }) },
      token,
    );
  }

  if (!payment.keyId || !payment.orderId) {
    throw new Error('Razorpay checkout configuration is incomplete');
  }

  let response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };

  try {
    const { default: RazorpayCheckout } = await import('react-native-razorpay');
    response = await RazorpayCheckout.open({
      key: payment.keyId,
      amount: payment.amount,
      currency: payment.currency || 'INR',
      name: 'FitOra',
      description,
      order_id: payment.orderId,
      prefill: {
        name: userName,
        email: userEmail,
      },
      theme: { color: '#6750A4' },
      retry: { enabled: true, max_count: 3 },
      config: {
        display: {
          sequence: ['upi', 'card', 'wallet', 'netbanking', 'paylater'],
          preferences: { show_default_blocks: true },
        },
      },
    });
  } catch (error) {
    const paymentError = error as { code?: number | string; description?: string };
    if (String(paymentError.code) === '0') throw new Error('Payment cancelled');
    if (
      error instanceof Error &&
      /native module|RNRazorpay|TurboModule|RazorpayEventEmitter/i.test(error.message)
    ) {
      throw new Error('Razorpay requires an Expo development build; it is unavailable in Expo Go.');
    }
    throw new Error(paymentError.description || 'Razorpay payment failed');
  }

  return apiFetch(
    '/payments/verify',
    {
      method: 'POST',
      body: JSON.stringify({
        paymentId: payment.paymentId,
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      }),
    },
    token,
  );
}
