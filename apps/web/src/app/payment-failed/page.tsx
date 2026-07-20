'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/navbar';
import { PageShell } from '@/components/app-header';

function PaymentFailedContent() {
  const params = useSearchParams();
  const reason = params.get('reason');
  const returnPath = params.get('return') ?? '/courts';
  const bookingId = params.get('bookingId');

  return (
    <PageShell>
      <Navbar />
      <main className="mx-auto max-w-lg px-4 sm:px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-red-100 bg-card p-10 shadow-sm"
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

          <h1 className="text-2xl font-extrabold text-foreground">Payment failed</h1>
          <p className="mt-2 text-sm text-muted">
            {reason
              ? `Reason: ${reason}`
              : 'Your payment could not be processed. No amount has been charged.'}
          </p>

          {/* What to do next */}
          <div className="mt-6 rounded-xl border border-border bg-background p-4 text-left text-sm space-y-2">
            <p className="font-semibold">What you can do:</p>
            <ul className="list-disc list-inside space-y-1 text-muted">
              <li>Check your payment method and try again</li>
              <li>Try a different UPI ID, card, or wallet</li>
              <li>Make sure your internet connection is stable</li>
              <li>Contact your bank if the issue persists</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={returnPath}
              className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
            >
              Try again
            </Link>
            {bookingId && (
              <Link
                href={`/bookings`}
                className="w-full rounded-xl border border-border px-6 py-3 text-sm font-semibold hover:bg-background transition-colors"
              >
                View my bookings
              </Link>
            )}
            <Link
              href="/courts"
              className="w-full rounded-xl border border-border px-6 py-3 text-sm font-semibold hover:bg-background transition-colors"
            >
              Browse other courts
            </Link>
            <a
              href="mailto:support@fitora.com"
              className="text-sm font-medium text-muted hover:text-primary transition-colors"
            >
              Contact support →
            </a>
          </div>
        </motion.div>
      </main>
    </PageShell>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense>
      <PaymentFailedContent />
    </Suspense>
  );
}
