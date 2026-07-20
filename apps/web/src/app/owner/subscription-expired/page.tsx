'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getAccessToken } from '@/lib/auth';

interface SubscriptionPlan {
  id: string;
  name: string;
  durationDays: number;
  total: number;
  gstRate: number;
}

interface OwnerSubscription {
  id: string;
  status: string;
  endDate: string | null;
  plan: SubscriptionPlan;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function OwnerSubscriptionExpiredPage() {
  const [subscription, setSubscription] = useState<OwnerSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    fetch(`${base}/subscriptions/my`, { headers })
      .then((r) => r.json())
      .then((data: OwnerSubscription) => setSubscription(data))
      .catch(() => null);

    fetch(`${base}/subscriptions/plans`, { headers })
      .then((r) => r.json())
      .then((data: SubscriptionPlan[]) => setPlans(data ?? []))
      .catch(() => null);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-3xl border border-red-100 bg-card p-10 shadow-sm"
      >
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <svg
            className="h-10 w-10 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>

        <h1 className="text-center text-2xl font-extrabold text-foreground">
          Subscription Expired
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          {subscription?.endDate
            ? `Your plan expired on ${formatDate(subscription.endDate)}.`
            : 'Your FitOra owner subscription is no longer active.'}
        </p>

        {/* What's blocked */}
        <div className="mt-6 rounded-xl border border-border bg-background p-4 text-sm space-y-2">
          <p className="font-semibold text-foreground">Currently disabled:</p>
          <ul className="space-y-1 text-muted">
            <li>• New booking creation &amp; slot management</li>
            <li>• Membership sales</li>
            <li>• Training program enrollment</li>
            <li>• Your venue is hidden from player search</li>
          </ul>
        </div>

        {/* Plans */}
        {plans.length > 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-semibold text-foreground">Available plans:</p>
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between rounded-xl border border-border p-4"
              >
                <div>
                  <p className="font-semibold text-sm">{plan.name}</p>
                  <p className="text-xs text-muted">{plan.durationDays} days</p>
                </div>
                <p className="text-lg font-extrabold text-primary">{formatPrice(plan.total)}</p>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 space-y-3">
          <Link
            href="/owner/settings"
            className="block w-full rounded-xl bg-primary px-6 py-3 text-center text-sm font-bold text-white hover:bg-primary/90 transition-colors"
          >
            Renew subscription
          </Link>
          <Link
            href="/owner"
            className="block w-full rounded-xl border border-border px-6 py-3 text-center text-sm font-semibold hover:bg-background transition-colors"
          >
            Back to dashboard
          </Link>
          <a
            href="mailto:support@fitora.com"
            className="block text-center text-sm text-muted hover:text-primary"
          >
            Contact support
          </a>
        </div>
      </motion.div>

      {/* Invoice history */}
      <p className="mt-4 text-xs text-muted">
        View past invoices in{' '}
        <Link href="/payments" className="font-medium text-primary hover:underline">
          Payment history
        </Link>
      </p>
    </main>
  );
}
