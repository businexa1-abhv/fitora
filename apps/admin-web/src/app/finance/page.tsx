'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { adminApi, getAccessToken, type AnalyticsDashboard, type PaymentReports } from '@/lib/api';
import { formatInr, pctShare } from '@/lib/format';

export default function FinancePage() {
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [reports, setReports] = useState<PaymentReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    void Promise.all([
      adminApi.getAnalyticsDashboard(token, { period: 'monthly' }),
      adminApi.getPaymentReports(token, 30),
    ])
      .then(([dashboard, paymentReports]) => {
        setAnalytics(dashboard);
        setReports(paymentReports);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalRevenue = reports?.summary.totalRevenue ?? analytics?.revenue.total ?? 0;
  const paidCount = reports?.summary.paidCount ?? 0;
  const breakdown = reports?.byEntityType.length
    ? reports.byEntityType
    : (analytics?.revenue.byEntityType ?? []);

  return (
    <AdminShell>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Financial Intelligence</h1>
        <p className="mt-1 text-sm text-muted">
          Real-time platform economy and settlement performance tracking.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Gross Revenue (30d)', loading ? '…' : formatInr(totalRevenue, true)],
          ['Paid Transactions', loading ? '…' : String(paidCount)],
          [
            'Period Overview',
            loading ? '…' : formatInr(analytics?.overview.totalRevenue ?? totalRevenue, true),
          ],
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
          Paid revenue by entity type for the last {reports?.periodDays ?? 30} days.
        </p>
        {loading && <p className="mt-6 text-sm text-muted">Loading payment reports…</p>}
        {!loading && breakdown.length === 0 && (
          <p className="mt-6 text-sm text-muted">No paid transactions in this period.</p>
        )}
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {breakdown.map((row, index) => {
            const cardStyles = [
              { bg: 'bg-primary-container/15', text: 'text-primary' },
              { bg: 'bg-info/10', text: 'text-info' },
              { bg: 'bg-secondary/10', text: 'text-secondary' },
            ];
            const style = cardStyles[index % cardStyles.length];
            return (
              <div key={row.entityType} className={`rounded-2xl p-4 ${style.bg}`}>
                <p className="text-sm font-semibold">{row.label}</p>
                <p className={`text-2xl font-bold ${style.text}`}>{formatInr(row.revenue, true)}</p>
                <p className="mt-1 text-xs text-muted">
                  {row.count} payments · {pctShare(row.revenue, totalRevenue)}% of total
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {reports && (
        <section className="mt-8 rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold">Transaction Summary</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Total', reports.summary.totalTransactions],
              ['Failed', reports.summary.failedCount],
              ['Pending', reports.summary.pendingCount],
              ['Refunded', reports.summary.refundedCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-surface-low px-4 py-3">
                <p className="text-xs uppercase text-muted">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </AdminShell>
  );
}
