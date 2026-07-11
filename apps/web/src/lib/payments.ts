import type { PaymentOrder } from '@fitora/shared';
import { apiFetch } from './api';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(script);
  });
}

export async function completePayment(
  token: string,
  payment: PaymentOrder,
  userEmail: string,
  userName: string,
  description: string,
): Promise<unknown> {
  if (payment.isMock || payment.mockMode) {
    return apiFetch('/payments/mock-complete', {
      method: 'POST',
      body: JSON.stringify({ paymentId: payment.paymentId }),
    }, token);
  }

  await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const options = {
      key: payment.keyId,
      amount: payment.amount,
      currency: payment.currency,
      name: 'Fitora',
      description,
      order_id: payment.orderId,
      prefill: { name: userName, email: userEmail },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const result = await apiFetch('/payments/verify', {
            method: 'POST',
            body: JSON.stringify({
              paymentId: payment.paymentId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          }, token);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  });
}
