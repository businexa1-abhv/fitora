'use client';

import { AdminShell } from '@/components/admin-shell';

export default function FinancePage() {
  return (
    <AdminShell>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Financial Intelligence</h1>
        <p className="mt-1 text-sm text-muted">
          Real-time platform economy and settlement performance tracking.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Gross Income', '₹2.4M'],
          ['Commission (15%)', '₹372.3k'],
          ['Subscriptions (65%)', '₹1.61M'],
        ].map(([label, value]) => (
          <article key={label} className="rounded-3xl border border-border bg-card p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 font-display text-3xl font-bold">{value}</p>
          </article>
        ))}
      </div>

      <section className="mt-8 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold">Revenue Breakdown</h2>
        <p className="mt-1 text-sm text-muted">
          Diversification of platform income streams (illustrative until settlements API is wired).
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-primary-container/15 p-4">
            <p className="text-sm font-semibold">Commission</p>
            <p className="text-2xl font-bold text-primary">15%</p>
          </div>
          <div className="rounded-2xl bg-info/10 p-4">
            <p className="text-sm font-semibold">Subscriptions</p>
            <p className="text-2xl font-bold text-info">65%</p>
          </div>
          <div className="rounded-2xl bg-secondary/10 p-4">
            <p className="text-sm font-semibold">Transaction Fees</p>
            <p className="text-2xl font-bold text-secondary">20%</p>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
