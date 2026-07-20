'use client';

import Link from 'next/link';

/**
 * Reusable static error screen for 403 / 503 / offline states.
 * Rendered as standalone pages or embedded in layouts.
 */
export function ErrorScreen({
  code,
  title,
  description,
  showRetry = false,
  onRetry,
}: {
  code: string;
  title: string;
  description: string;
  showRetry?: boolean;
  onRetry?: () => void;
}) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-20 text-center">
      <div className="max-w-md">
        <p className="text-8xl font-extrabold text-primary opacity-20 select-none">{code}</p>
        <h1 className="mt-2 text-2xl font-extrabold text-foreground">{title}</h1>
        <p className="mt-3 text-sm text-muted">{description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {showRetry && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
            >
              Try again
            </button>
          )}
          <Link
            href="/"
            className="rounded-xl border border-border px-6 py-2.5 text-sm font-semibold hover:bg-background transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
