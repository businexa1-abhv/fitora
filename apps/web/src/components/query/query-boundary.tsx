'use client';

import React from 'react';

interface QueryBoundaryProps {
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function QueryBoundary({ isLoading, isError, error, onRetry, children }: QueryBoundaryProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl skeleton" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">{error?.message ?? 'Failed to load data'}</p>
        {onRetry && (
          <button type="button" className="btn-outline mt-3 text-sm" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
