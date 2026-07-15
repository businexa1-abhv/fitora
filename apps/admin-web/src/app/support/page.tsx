'use client';

import { AdminShell } from '@/components/admin-shell';

export default function SupportPage() {
  return (
    <AdminShell>
      <h1 className="font-display text-3xl font-bold">Support Queue</h1>
      <p className="mt-1 text-sm text-muted">Escalated partner and player tickets.</p>
      <div className="mt-8 space-y-3">
        {[
          ['Payment Failure #8921', 'URGENT'],
          ['KYC document upload error', 'STANDARD'],
          ['Settlement delay inquiry', 'STANDARD'],
        ].map(([title, tag]) => (
          <article
            key={title}
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4"
          >
            <p className="font-medium">{title}</p>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                tag === 'URGENT' ? 'bg-error/10 text-error' : 'bg-surface-high text-muted'
              }`}
            >
              {tag}
            </span>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
