declare module 'react-native-razorpay' {
  type RazorpaySuccess = {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };

  type RazorpayOptions = {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    order_id: string;
    prefill?: { name?: string; email?: string; contact?: string };
    theme?: { color?: string };
    retry?: { enabled: boolean; max_count?: number };
    config?: {
      display?: {
        sequence?: string[];
        preferences?: { show_default_blocks?: boolean };
      };
    };
  };

  export default class RazorpayCheckout {
    static open(options: RazorpayOptions): Promise<RazorpaySuccess>;
  }
}
