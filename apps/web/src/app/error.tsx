'use client';

import Link from 'next/link';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-20 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <svg
            className="h-8 w-8 text-red-600"
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
        <h1 className="text-xl font-extrabold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">
          This section couldn&apos;t load. Please try again.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
