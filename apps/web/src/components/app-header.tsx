'use client';

import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export function AppHeader({
  children,
  backHref,
  title,
}: {
  children?: React.ReactNode;
  backHref?: string;
  title?: string;
}) {
  return (
    <>
      <Navbar />
      {(backHref || title) && (
        <div className="bg-card border-b border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center gap-3">
            {backHref && (
              <Link
                href={backHref}
                className="flex items-center gap-1 text-sm font-medium text-muted hover:text-primary transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Link>
            )}
            {title && <h1 className="text-sm font-semibold">{title}</h1>}
            <div className="ml-auto flex items-center gap-3">{children}</div>
          </div>
        </div>
      )}
      {!backHref && !title && children && (
        <div className="bg-card border-b border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex justify-end">{children}</div>
        </div>
      )}
    </>
  );
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatPrice(amount: string | number) {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {children}
      <Footer />
    </div>
  );
}
