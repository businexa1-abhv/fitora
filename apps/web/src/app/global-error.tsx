'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error tracking (Sentry would be wired here in production)
    console.error('[GlobalError]', error.message, error.digest);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <main className="flex min-h-screen flex-col items-center justify-center px-4 py-20 text-center">
          <div className="max-w-md">
            <p className="text-8xl font-extrabold text-red-500 opacity-20 select-none">500</p>
            <h1 className="mt-2 text-2xl font-extrabold text-foreground">Something went wrong</h1>
            <p className="mt-3 text-sm text-muted">
              An unexpected error occurred. Our team has been notified.
            </p>
            {error.digest && (
              <p className="mt-2 font-mono text-xs text-muted/60">Error ID: {error.digest}</p>
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={reset}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
              >
                Try again
              </button>
              <Link
                href="/"
                className="rounded-xl border border-border px-6 py-2.5 text-sm font-semibold hover:bg-background transition-colors"
              >
                Back to home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
