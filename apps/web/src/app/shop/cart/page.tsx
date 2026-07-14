'use client';

import React from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Cart, ProductCategory, SportType } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell, formatPrice } from '@/components/app-header';
import { FadeUp } from '@/components/motion';
import { getAccessToken } from '@/lib/auth';
import { getCart, removeCartItem, updateCartItem } from '@/lib/shop';
import { productEmoji } from '@/lib/shop-constants';

export default function CartPage(): React.JSX.Element {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    getCart(token)
      .then(setCart)
      .catch(() => setCart(null))
      .finally(() => setLoading(false));
  }, [router]);

  async function changeQty(itemId: string, quantity: number) {
    const token = getAccessToken();
    if (!token) return;
    setUpdating(itemId);
    try {
      const updated = await updateCartItem(token, itemId, quantity);
      setCart(updated);
    } finally {
      setUpdating(null);
    }
  }

  async function remove(itemId: string) {
    const token = getAccessToken();
    if (!token) return;
    setUpdating(itemId);
    try {
      const updated = await removeCartItem(token, itemId);
      setCart(updated);
    } finally {
      setUpdating(null);
    }
  }

  const total =
    cart?.items.reduce(
      (sum, item) => sum + Number(item.product?.price ?? 0) * item.quantity,
      0,
    ) ?? 0;

  return (
    <PageShell>
      <Navbar />

      <section className="hero-mesh text-white py-10 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-extrabold">Your cart</h1>
            <p className="text-white/75 mt-2">
              {cart?.items.length ?? 0} item{(cart?.items.length ?? 0) === 1 ? '' : 's'}
            </p>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 -mt-4">
        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl skeleton" />
            ))}
          </div>
        )}

        {!loading && (!cart || cart.items.length === 0) && (
          <FadeUp>
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
              <span className="text-4xl">🛒</span>
              <p className="text-lg font-semibold mt-4">Your cart is empty</p>
              <Link
                href="/shop"
                className="inline-flex mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-dark transition-colors"
              >
                Browse shop
              </Link>
            </div>
          </FadeUp>
        )}

        {cart && cart.items.length > 0 && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item, i) => (
                <FadeUp key={item.id} delay={i * 0.05}>
                  <div className="card-hover rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm flex gap-4">
                    <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-light text-2xl shrink-0">
                      {item.product
                        ? productEmoji(
                            item.product.category as ProductCategory,
                            item.product.sportType as SportType | undefined,
                          )
                        : '📦'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/shop/${item.product?.slug}`}
                        className="font-bold hover:text-primary transition-colors line-clamp-1"
                      >
                        {item.product?.name}
                      </Link>
                      <p className="text-primary font-extrabold mt-1">
                        {formatPrice(item.product?.price ?? 0)}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <div className="flex items-center rounded-lg border border-border overflow-hidden text-sm">
                          <button
                            disabled={updating === item.id || item.quantity <= 1}
                            onClick={() => changeQty(item.id, item.quantity - 1)}
                            className="px-3 py-1.5 font-bold hover:bg-primary-light disabled:opacity-40"
                          >
                            −
                          </button>
                          <span className="px-3 py-1.5 font-semibold">{item.quantity}</span>
                          <button
                            disabled={
                              updating === item.id ||
                              item.quantity >= (item.product?.stock ?? 0)
                            }
                            onClick={() => changeQty(item.id, item.quantity + 1)}
                            className="px-3 py-1.5 font-bold hover:bg-primary-light disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => remove(item.id)}
                          disabled={updating === item.id}
                          className="text-sm text-red-600 hover:underline disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <p className="font-extrabold text-lg shrink-0">
                      {formatPrice(Number(item.product?.price ?? 0) * item.quantity)}
                    </p>
                  </div>
                </FadeUp>
              ))}
            </div>

            <FadeUp delay={0.15}>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm h-fit sticky top-24">
                <h2 className="font-bold text-lg mb-4">Order summary</h2>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted">Subtotal</span>
                  <span className="font-semibold">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-muted">Shipping</span>
                  <span className="text-primary font-semibold">Free</span>
                </div>
                <hr className="border-border mb-4" />
                <div className="flex justify-between mb-6">
                  <span className="font-bold">Total</span>
                  <span className="text-xl font-extrabold text-primary">{formatPrice(total)}</span>
                </div>
                <Link
                  href="/shop/checkout"
                  className="block w-full text-center rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-dark transition-colors"
                >
                  Proceed to checkout
                </Link>
              </div>
            </FadeUp>
          </div>
        )}
      </main>
    </PageShell>
  );
}
