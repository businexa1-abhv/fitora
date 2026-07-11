'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Cart } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell, formatPrice } from '@/components/app-header';
import { buttonClassName, FormField, inputClassName } from '@/components/auth-layout';
import { ApiError } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { completePayment } from '@/lib/payments';
import { checkout, getCart, validateShopCoupon } from '@/lib/shop';

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [discountPreview, setDiscountPreview] = useState<number | null>(null);
  const [form, setForm] = useState({
    shippingName: '',
    shippingPhone: '',
    shippingAddress: '',
    shippingCity: '',
    shippingPincode: '',
  });

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();
    if (!token || !user) {
      router.replace('/login');
      return;
    }

    setForm((prev) => ({
      ...prev,
      shippingName: `${user.firstName} ${user.lastName}`,
    }));

    getCart(token)
      .then((c) => {
        if (c.items.length === 0) router.replace('/shop/cart');
        setCart(c);
      })
      .catch(() => router.replace('/shop/cart'))
      .finally(() => setLoading(false));
  }, [router]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    const user = getStoredUser();
    if (!token || !user) return;

    setSubmitting(true);
    setError('');

    try {
      const { order, payment } = await checkout(token, {
        ...form,
        couponCode: couponCode.trim() || undefined,
      });
      await completePayment(
        token,
        payment,
        user.email,
        `${user.firstName} ${user.lastName}`,
        `Shop order — ${order.items.length} item(s)`,
      );
      router.push('/shop/orders');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  }

  const subtotal =
    cart?.items.reduce(
      (sum, item) => sum + Number(item.product?.price ?? 0) * item.quantity,
      0,
    ) ?? 0;
  const shipping = subtotal >= 999 ? 0 : 99;
  const total = Math.max(0, subtotal + shipping - (discountPreview ?? 0));

  async function applyCoupon() {
    const token = getAccessToken();
    if (!token || !couponCode.trim()) return;
    try {
      const result = await validateShopCoupon(token, couponCode.trim(), subtotal + shipping);
      setDiscountPreview(result.discountAmount);
    } catch {
      setDiscountPreview(null);
      setError('Invalid coupon code');
    }
  }

  if (loading) {
    return (
      <PageShell>
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-32">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Navbar />

      <section className="hero-mesh text-white py-10 sm:py-12">
        <div className="mx-auto max-w-lg px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl sm:text-3xl font-extrabold">Checkout</h1>
            <p className="text-white/75 mt-2 text-sm">Enter shipping details to complete your order</p>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-lg px-4 sm:px-6 py-8 -mt-4">
        <div className="rounded-2xl border border-border bg-primary-light/50 p-4 mb-6 text-sm space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
          </div>
          {discountPreview != null && discountPreview > 0 && (
            <div className="flex justify-between text-primary">
              <span>Coupon discount</span>
              <span>-{formatPrice(discountPreview)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold border-t border-border pt-2">
            <span>{cart?.items.length} item(s)</span>
            <span className="text-primary">{formatPrice(total)}</span>
          </div>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-5"
        >
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <FormField label="Full name" id="name">
            <input
              id="name"
              required
              className={inputClassName}
              value={form.shippingName}
              onChange={(e) => update('shippingName', e.target.value)}
            />
          </FormField>

          <FormField label="Phone" id="phone">
            <input
              id="phone"
              type="tel"
              required
              className={inputClassName}
              value={form.shippingPhone}
              onChange={(e) => update('shippingPhone', e.target.value)}
            />
          </FormField>

          <FormField label="Address" id="address">
            <textarea
              id="address"
              required
              rows={2}
              className={inputClassName}
              value={form.shippingAddress}
              onChange={(e) => update('shippingAddress', e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="City" id="city">
              <input
                id="city"
                required
                className={inputClassName}
                value={form.shippingCity}
                onChange={(e) => update('shippingCity', e.target.value)}
              />
            </FormField>
            <FormField label="Pincode" id="pincode">
              <input
                id="pincode"
                required
                pattern="[0-9]{6}"
                className={inputClassName}
                value={form.shippingPincode}
                onChange={(e) => update('shippingPincode', e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Coupon code (optional)" id="coupon">
            <div className="flex gap-2">
              <input
                id="coupon"
                className={inputClassName}
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="SAVE10"
              />
              <button type="button" onClick={applyCoupon} className="rounded-xl border border-border px-4 text-sm font-semibold shrink-0">
                Apply
              </button>
            </div>
          </FormField>

          <button type="submit" disabled={submitting} className={`${buttonClassName} w-full py-3`}>
            {submitting ? 'Processing payment…' : `Pay ${formatPrice(total)}`}
          </button>
        </motion.form>
      </main>
    </PageShell>
  );
}
