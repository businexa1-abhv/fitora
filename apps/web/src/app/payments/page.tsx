'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PAYMENT_ENTITY_LABELS,
  PAYMENT_STATUS_LABELS,
  PaymentEntityType,
  PaymentStatus,
  type PaymentRecord,
} from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell, formatPrice } from '@/components/app-header';
import { getAccessToken } from '@/lib/auth';
import { getMyPayments } from '@/lib/payment-history';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-slate-100 text-slate-800',
  PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-800',
};

export default function PaymentHistoryPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    getMyPayments(token, filter ? { entityType: filter } : undefined)
      .then((res) => setPayments(res.items))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, [router, filter]);

  return (
    <PageShell>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold">Payment history</h1>
          <p className="text-sm text-muted mt-1">Bookings, memberships, training, store, services & printing</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${!filter ? 'bg-primary text-primary-foreground' : 'border border-border text-muted'}`}
          >
            All
          </button>
          {Object.values(PaymentEntityType).slice(0, 6).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === type ? 'bg-primary text-primary-foreground' : 'border border-border text-muted'}`}
            >
              {PAYMENT_ENTITY_LABELS[type]}
            </button>
          ))}
        </div>

        {loading && <div className="h-32 rounded-2xl skeleton" />}

        <div className="space-y-3">
          {payments.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{PAYMENT_ENTITY_LABELS[p.entityType as PaymentEntityType]}</p>
                  <p className="text-sm text-muted font-mono">{p.id.slice(0, 8)}…</p>
                  <p className="text-lg font-extrabold text-primary mt-1">{formatPrice(Number(p.amount))}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[p.status] ?? ''}`}>
                  {PAYMENT_STATUS_LABELS[p.status as PaymentStatus]}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted">
                <span>{new Date(p.createdAt).toLocaleString()}</span>
                {p.paidAt && <span>Paid {new Date(p.paidAt).toLocaleDateString()}</span>}
                {p.invoiceNumber && <span>Invoice {p.invoiceNumber}</span>}
              </div>
              {p.status === PaymentStatus.PAID && (
                <Link
                  href={`/payments/${p.id}/invoice`}
                  className="text-sm text-primary font-semibold mt-3 inline-block hover:underline"
                >
                  View invoice →
                </Link>
              )}
            </div>
          ))}
          {!loading && payments.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted">
              No payments yet
            </div>
          )}
        </div>
      </main>
    </PageShell>
  );
}
