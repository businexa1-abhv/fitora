'use client';

import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Star, TrendingUp } from 'lucide-react';
import { QueryBoundary } from '@/components/query/query-boundary';
import { getListingReviews, getMyListings } from '@/lib/marketplace';
import { useAuthToken } from '@/hooks/use-auth-token';

export default function ProviderReviewsPage() {
  const token = useAuthToken();
  const [filter, setFilter] = useState<'all' | 'critical' | 'needs'>('all');

  const listingsQuery = useQuery({
    queryKey: ['provider', 'listings'],
    queryFn: () => getMyListings(token!),
    enabled: !!token,
  });

  const listings = listingsQuery.data ?? [];

  const reviewQueries = useQueries({
    queries: listings.slice(0, 20).map((listing) => ({
      queryKey: ['provider', 'listing-reviews', listing.id],
      queryFn: () => getListingReviews(listing.id),
      enabled: !!token && listings.length > 0,
    })),
  });

  const reviews = useMemo(() => {
    return reviewQueries.flatMap((q, i) => {
      const listing = listings[i];
      return (q.data ?? []).map((r) => ({
        ...r,
        listingTitle: listing?.title ?? 'Service',
        listingId: listing?.id ?? '',
      }));
    });
  }, [reviewQueries, listings]);

  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const critical = reviews.filter((r) => r.rating <= 2);
  const positivePct = reviews.length
    ? Math.round((reviews.filter((r) => r.rating >= 4).length / reviews.length) * 100)
    : 0;

  const filtered = filter === 'critical' ? critical : filter === 'needs' ? critical : reviews;

  const loading = listingsQuery.isLoading || reviewQueries.some((q) => q.isLoading);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ratings & Reviews</h1>
        <p className="mt-1 text-sm text-muted">Customer feedback across your service listings</p>
      </div>

      <QueryBoundary
        isLoading={listingsQuery.isLoading}
        isError={listingsQuery.isError}
        error={listingsQuery.error as Error}
        onRetry={() => listingsQuery.refetch()}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-muted">Average Rating</p>
            <p className="mt-2 flex items-center gap-2 text-3xl font-bold">
              {avg ? avg.toFixed(1) : '—'}
              <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
            </p>
            <p className="mt-1 text-xs text-muted">Based on {reviews.length} reviews</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-muted">SLA Response Rate</p>
            <p className="mt-2 text-3xl font-bold">98.4%</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" /> +2.1% from last month
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-muted">Avg. Response Time</p>
            <p className="mt-2 text-3xl font-bold">4.2h</p>
            <p className="mt-1 text-xs text-muted">Target: &lt; 24h</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-muted">Review Sentiments</p>
            <p className="mt-2 text-sm font-semibold text-emerald-700">Positive ({positivePct}%)</p>
            <p className="text-sm text-muted">Critical ({critical.length})</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', 'All Reviews'],
              ['critical', `Critical (${critical.length})`],
              ['needs', `Needs Reply (${critical.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                filter === id
                  ? 'bg-[#ff6b00] text-white'
                  : 'border border-border bg-card text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {loading && <p className="text-sm text-muted">Loading reviews…</p>}
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted">
              No reviews yet. Completed jobs will surface ratings here.
            </div>
          )}
          {filtered.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">
                    {review.user ? `${review.user.firstName} ${review.user.lastName}` : 'Customer'}
                  </p>
                  <p className="text-xs text-muted">
                    Service · {review.listingTitle} ·{' '}
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 text-amber-500">
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
      </QueryBoundary>
    </div>
  );
}
