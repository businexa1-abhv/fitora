'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { adminApi, getAccessToken, type PaymentReports } from '@/lib/api';
import { formatInr } from '@/lib/format';

export default function GstPage() {
  const [reports, setReports] = useState<PaymentReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    void adminApi
      .getPaymentReports(token, 30)
      .then(setReports)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalTax = reports?.summary.totalTax ?? 0;

  return (
    <AdminShell>
      <h1 className="font-display text-3xl font-bold">GST & Tax</h1>
      <p className="mt-1 text-sm text-muted">
        Tax collected on paid invoices for the last {reports?.periodDays ?? 30} days.
      </p>

      {error && (
        <p className="mt-4 rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl border border-border bg-card p-5">
          <p className="text-sm text-muted">Total GST / Tax Collected</p>
          <p className="mt-2 font-display text-3xl font-bold">
            {loading ? '…' : formatInr(totalTax, true)}
          </p>
        </article>
        <article className="rounded-3xl border border-border bg-card p-5">
          <p className="text-sm text-muted">Taxable Revenue Base</p>
          <p className="mt-2 font-display text-3xl font-bold">
            {loading ? '…' : formatInr(reports?.summary.totalRevenue ?? 0, true)}
          </p>
        </article>
      </div>
    </AdminShell>
  );
}
