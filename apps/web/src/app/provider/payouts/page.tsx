'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { apiFetch } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

type Wallet = {
  role: string;
  available: number;
  pending: number;
  settled: number;
  lifetimeEarned: number;
};

type Settlement = {
  id: string;
  gross: number;
  commission: number;
  net: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
};

function inr(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ProviderPayoutsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      setError('Sign in to view payouts');
      return;
    }
    setLoading(true);
    void Promise.all([
      apiFetch<Wallet[]>('/wallet/merchant', {}, token),
      apiFetch<Settlement[]>('/settlements', {}, token),
    ])
      .then(([w, s]) => {
        setWallets(w);
        setSettlements(s);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const wallet = wallets.find((w) => w.role === 'SERVICE_PROVIDER') ?? wallets[0];

  return (
    <div className="space-y-6">
      <OwnerPageHeader title="Payouts" description="Settlements and commission history" />

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Pending', wallet ? inr(wallet.pending) : loading ? '…' : '₹0'],
          ['Available', wallet ? inr(wallet.available) : loading ? '…' : '₹0'],
          ['Lifetime paid', wallet ? inr(wallet.settled) : loading ? '…' : '₹0'],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-2xl font-bold text-[#a04100]">{value}</p>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold">Settlement history</h2>
        </div>
        {settlements.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">
            {loading
              ? 'Loading…'
              : 'No settlements yet. Earnings post to your wallet after paid orders.'}
            <div className="mt-4">
              <Link href="/provider" className="text-sm font-semibold text-[#ff6b00]">
                Back to dashboard
              </Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {settlements.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    {new Date(s.periodStart).toLocaleDateString()} –{' '}
                    {new Date(s.periodEnd).toLocaleDateString()}
                  </p>
                  <p className="text-muted">
                    Gross {inr(s.gross)} · Commission {inr(s.commission)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{inr(s.net)}</p>
                  <p className="text-muted">{s.status}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
