'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  SERVICE_CATEGORY_LABELS,
  SERVICE_ORDER_STATUS_LABELS,
  ServiceCategory,
  ServiceOrderStatus,
  type ServiceOrder,
} from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell, formatPrice } from '@/components/app-header';
import { FadeUp } from '@/components/motion';
import { getAccessToken } from '@/lib/auth';
import { createServiceReview, getMyServiceOrders } from '@/lib/marketplace';
import { SERVICE_EMOJIS } from '@/lib/marketplace-constants';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-violet-100 text-violet-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function ServiceOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState<Record<string, { rating: string; comment: string }>>({});

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    setOrders(await getMyServiceOrders(token));
  }

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    load().catch(() => setOrders([])).finally(() => setLoading(false));
  }, [router]);

  async function submitReview(order: ServiceOrder) {
    const token = getAccessToken();
    const form = reviewForm[order.id];
    if (!token || !form?.rating || !order.listingId) return;
    await createServiceReview(token, order.listingId, {
      rating: Number(form.rating),
      comment: form.comment || undefined,
    });
    await load();
  }

  return (
    <PageShell>
      <Navbar />

      <section className="hero-mesh text-white py-10 sm:py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Link href="/services" className="text-white/70 text-sm hover:text-white mb-4 inline-block">
              ← Back to services
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold">My service orders</h1>
            <p className="text-white/75 mt-2 text-sm">Track bookings, status updates, and leave ratings</p>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 -mt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <FadeUp>
            <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-semibold">No orders yet</p>
              <Link href="/services" className="btn-primary inline-flex mt-4">
                Browse services
              </Link>
            </div>
          </FadeUp>
        ) : (
          <div className="space-y-4">
            {orders.map((order, i) => {
              const cat = order.listing?.category as ServiceCategory | undefined;
              const emoji = cat ? SERVICE_EMOJIS[cat] : '⚙️';
              return (
                <FadeUp key={order.id} delay={i * 0.05}>
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <span className="text-2xl">{emoji}</span>
                        <div>
                          <p className="font-bold">{order.orderNumber}</p>
                          <p className="text-sm font-medium">{order.listing?.title ?? 'Service order'}</p>
                          <p className="text-xs text-muted mt-0.5">
                            {cat && SERVICE_CATEGORY_LABELS[cat]}
                            {order.provider && ` · ${order.provider.firstName} ${order.provider.lastName}`}
                          </p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${STATUS_COLORS[order.status] ?? 'bg-muted/20'}`}>
                        {SERVICE_ORDER_STATUS_LABELS[order.status as ServiceOrderStatus]}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted">
                      <span>{formatPrice(Number(order.totalAmount))}</span>
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    {order.trackingReference && (
                      <p className="text-sm mt-3">
                        Tracking: <span className="font-mono font-semibold">{order.trackingReference}</span>
                      </p>
                    )}
                    {order.rentalStartDate && order.rentalEndDate && (
                      <p className="text-sm mt-2 text-muted">
                        Rental: {new Date(order.rentalStartDate).toLocaleDateString()} – {new Date(order.rentalEndDate).toLocaleDateString()}
                      </p>
                    )}
                    {order.status === ServiceOrderStatus.COMPLETED && order.listingId && (
                      <form
                        onSubmit={(e: FormEvent) => { e.preventDefault(); submitReview(order); }}
                        className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2 items-end"
                      >
                        <select
                          required
                          className="rounded-lg border border-border px-3 py-2 text-sm"
                          value={reviewForm[order.id]?.rating ?? ''}
                          onChange={(e) => setReviewForm({ ...reviewForm, [order.id]: { ...reviewForm[order.id], rating: e.target.value, comment: reviewForm[order.id]?.comment ?? '' } })}
                        >
                          <option value="">Rate</option>
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>{n} stars</option>
                          ))}
                        </select>
                        <input
                          placeholder="Review (optional)"
                          className="rounded-lg border border-border px-3 py-2 text-sm flex-1 min-w-[160px]"
                          value={reviewForm[order.id]?.comment ?? ''}
                          onChange={(e) => setReviewForm({ ...reviewForm, [order.id]: { rating: reviewForm[order.id]?.rating ?? '', comment: e.target.value } })}
                        />
                        <button type="submit" className="btn-primary text-sm">Submit rating</button>
                      </form>
                    )}
                  </div>
                </FadeUp>
              );
            })}
          </div>
        )}
      </main>
    </PageShell>
  );
}
