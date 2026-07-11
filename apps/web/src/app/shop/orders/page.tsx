'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ORDER_STATUS_LABELS, type ProductCategory, type ShopOrder, type SportType } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell, formatDate, formatPrice } from '@/components/app-header';
import { FadeUp } from '@/components/motion';
import { getAccessToken } from '@/lib/auth';
import { getMyOrders } from '@/lib/shop';
import { productEmoji } from '@/lib/shop-constants';

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    getMyOrders(token)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <PageShell>
      <Navbar />

      <section className="hero-mesh text-white py-12 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl sm:text-4xl font-extrabold">My orders</h1>
            <p className="text-white/75 mt-2">Track your shop purchases</p>
            <Link
              href="/shop"
              className="inline-flex mt-5 rounded-xl bg-white/20 backdrop-blur px-5 py-2.5 text-sm font-semibold hover:bg-white/30 transition-colors"
            >
              Continue shopping →
            </Link>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 -mt-4">
        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-36 rounded-2xl skeleton" />
            ))}
          </div>
        )}

        {!loading && orders.length === 0 && (
          <FadeUp>
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-16 text-center">
              <span className="text-4xl">📦</span>
              <p className="text-lg font-semibold mt-4">No orders yet</p>
              <Link
                href="/shop"
                className="inline-flex mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-dark transition-colors"
              >
                Browse shop
              </Link>
            </div>
          </FadeUp>
        )}

        <div className="space-y-5">
          {orders.map((order, i) => (
            <FadeUp key={order.id} delay={i * 0.06}>
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="bg-primary-light px-5 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-border">
                  <div>
                    <p className="text-xs text-muted">Order · {formatDate(order.createdAt)}</p>
                    <p className="font-bold text-sm">#{order.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 text-xs font-bold">
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                    <span className="font-extrabold text-primary">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 text-sm">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-lg shrink-0">
                        {item.product
                          ? productEmoji(
                              item.product.category as ProductCategory,
                              item.product.sportType as SportType | undefined,
                            )
                          : '📦'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{item.productName}</p>
                        <p className="text-muted text-xs">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold shrink-0">
                        {formatPrice(Number(item.productPrice) * item.quantity)}
                      </p>
                    </div>
                  ))}

                  <p className="text-xs text-muted pt-2 border-t border-border">
                    Ship to: {order.shippingName}, {order.shippingAddress}, {order.shippingCity} — {order.shippingPincode}
                  </p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </main>
    </PageShell>
  );
}
