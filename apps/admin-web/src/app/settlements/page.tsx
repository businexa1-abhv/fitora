'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { adminApi, getAccessToken } from '@/lib/api';
import { formatInr } from '@/lib/format';

type PlatformReport = Awaited<ReturnType<typeof adminApi.getPlatformFinanceReport>>;
type SettlementRow = Awaited<ReturnType<typeof adminApi.listSettlements>>[number];

export default function SettlementsPage() {
  const [report, setReport] = useState<PlatformReport | null>(null);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    void Promise.all([adminApi.getPlatformFinanceReport(token), adminApi.listSettlements(token)])
      .then(([platform, list]) => {
        setReport(platform);
        setSettlements(list);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runSettlements = async () => {
    const token = getAccessToken();
    if (!token) return;
    setProcessing(true);
    try {
      await adminApi.processSettlements(token);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Settlement failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Settlements</h1>
          <p className="mt-1 text-sm text-muted">
            Platform GMV, commission, and partner payout batches from the revenue ledger.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runSettlements()}
          disabled={processing}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {processing ? 'Processing…' : 'Run weekly settlements'}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Today's / period GMV", loading ? '…' : formatInr(report?.gmv ?? 0, true)],
          ['Platform revenue', loading ? '…' : formatInr(report?.platformRevenue ?? 0, true)],
          ['Commission', loading ? '…' : formatInr(report?.platformCommission ?? 0, true)],
          ['Pending settlements', loading ? '…' : String(report?.pendingSettlements ?? 0)],
        ].map(([label, value]) => (
          <article key={label} className="rounded-3xl border border-border bg-card p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 font-display text-3xl font-bold">{value}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          ['Active owners', loading ? '…' : String(report?.activeOwners ?? 0)],
          [
            'Subscription revenue',
            loading ? '…' : formatInr(report?.subscriptionRevenue ?? 0, true),
          ],
          ['Failed payouts', loading ? '…' : String(report?.failedPayouts ?? 0)],
        ].map(([label, value]) => (
          <article key={label} className="rounded-3xl border border-border bg-card p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{value}</p>
          </article>
        ))}
      </div>

      <section className="mt-10 overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-xl font-bold">Settlement batches</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/30 text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Period</th>
                <th className="px-5 py-3 font-medium">Gross</th>
                <th className="px-5 py-3 font-medium">Commission</th>
                <th className="px-5 py-3 font-medium">Net</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Payout</th>
              </tr>
            </thead>
            <tbody>
              {settlements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-muted">
                    {loading
                      ? 'Loading…'
                      : 'No settlement batches yet. Run weekly settlements after partner earnings accrue.'}
                  </td>
                </tr>
              )}
              {settlements.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-5 py-3">
                    {new Date(row.periodStart).toLocaleDateString()} –{' '}
                    {new Date(row.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">{formatInr(row.gross, true)}</td>
                  <td className="px-5 py-3">{formatInr(row.commission, true)}</td>
                  <td className="px-5 py-3 font-semibold">{formatInr(row.net, true)}</td>
                  <td className="px-5 py-3">{row.status}</td>
                  <td className="px-5 py-3">{row.payoutStatus ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
