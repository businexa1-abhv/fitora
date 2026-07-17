'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { ShopShell } from '@/components/shop-shell';
import { getAccessToken, shopPartnerApi, type ProductReview, type ShopProduct } from '@/lib/api';
import { formatDate } from '@/lib/format';

export default function ShopReviewsPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [reviews, setReviews] = useState<(ProductReview & { productName: string; slug: string })[]>(
    [],
  );
  const [filter, setFilter] = useState<'all' | 'critical' | 'featured'>('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    shopPartnerApi
      .listProducts(token)
      .then(async (items) => {
        setProducts(items);
        const batches = await Promise.all(
          items.slice(0, 12).map(async (p) => {
            try {
              const list = await shopPartnerApi.getProductReviews(p.slug);
              return list.map((r) => ({ ...r, productName: p.name, slug: p.slug }));
            } catch {
              return [];
            }
          }),
        );
        setReviews(batches.flat().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load reviews'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const critical = reviews.filter((r) => r.rating <= 2);
  const positive = reviews.filter((r) => r.rating >= 4);

  const filtered = useMemo(() => {
    if (filter === 'critical') return critical;
    if (filter === 'featured') return positive.slice(0, 10);
    return reviews;
  }, [filter, reviews, critical, positive]);

  return (
    <ShopShell>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Ratings & Reviews</h1>
        <p className="mt-1 text-sm text-muted">
          Customer feedback across {products.length} catalog products.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase text-muted">Average Rating</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-bold">
            {avg ? avg.toFixed(1) : '—'}
            <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
          </p>
          <p className="mt-1 text-xs text-muted">Based on {reviews.length} reviews</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase text-muted">Positive share</p>
          <p className="mt-2 text-3xl font-bold">
            {reviews.length ? Math.round((positive.length / reviews.length) * 100) : 0}%
          </p>
          <p className="mt-1 text-xs text-muted">{positive.length} ratings ≥ 4★</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase text-muted">Critical</p>
          <p className="mt-2 text-3xl font-bold text-error">{critical.length}</p>
          <p className="mt-1 text-xs text-muted">Needs attention</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['all', 'All Reviews'],
            ['critical', `Critical (${critical.length})`],
            ['featured', 'Featured'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              filter === id
                ? 'bg-primary-container text-white'
                : 'border border-border bg-white text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && <p className="text-sm text-muted">Loading reviews…</p>}
        {!loading && filtered.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            No reviews yet for your products.
          </p>
        )}
        {filtered.map((review) => (
          <article
            key={review.id}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {review.user ? `${review.user.firstName} ${review.user.lastName}` : 'Customer'}
                  {review.isVerified && (
                    <span className="ml-2 rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">
                      Verified
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {review.productName} · {formatDate(review.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < review.rating ? 'fill-amber-400' : 'text-border'}`}
                  />
                ))}
              </div>
            </div>
            {review.title && <p className="mt-3 font-bold">{review.title}</p>}
            <p className="mt-1 text-sm text-muted">{review.comment || 'No written comment.'}</p>
          </article>
        ))}
      </div>
    </ShopShell>
  );
}
