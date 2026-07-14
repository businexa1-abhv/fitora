'use client';

import React from 'react';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PrintOrderStatus, PRINT_ORDER_STATUS_LABELS, type PrintOrder } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell, formatPrice } from '@/components/app-header';
import { getAccessToken } from '@/lib/auth';
import { approvePrintDesign, getMyPrintOrders, rejectPrintDesign } from '@/lib/print';

const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: 'bg-blue-100 text-blue-800',
  DESIGN_REVIEW: 'bg-amber-100 text-amber-800',
  IN_PRODUCTION: 'bg-violet-100 text-violet-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function PrintOrdersPage(): React.JSX.Element {
  const [orders, setOrders] = useState<PrintOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    setOrders(await getMyPrintOrders(token));
  }

  useEffect(() => {
    load().catch(() => setOrders([])).finally(() => setLoading(false));
  }, []);

  async function approve(orderId: string) {
    const token = getAccessToken();
    if (!token) return;
    await approvePrintDesign(token, orderId);
    await load();
  }

  async function reject(orderId: string) {
    const token = getAccessToken();
    const reason = rejectReason[orderId]?.trim();
    if (!token || !reason) return;
    await rejectPrintDesign(token, orderId, reason);
    await load();
  }

  return (
    <PageShell>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-extrabold">My print orders</h1>
          <Link href="/print" className="text-sm text-primary font-semibold">+ New order</Link>
        </div>

        {loading && <div className="h-32 rounded-2xl skeleton" />}

        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{order.orderNumber}</p>
                  <p className="text-sm text-muted">{order.listing?.title} · {order.quantity}x {order.tshirtSize} {order.tshirtColor}</p>
                  <p className="text-sm font-semibold text-primary mt-1">{formatPrice(order.totalAmount)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[order.status] ?? 'bg-slate-100'}`}>
                  {PRINT_ORDER_STATUS_LABELS[order.status as PrintOrderStatus] ?? order.status}
                </span>
              </div>

              {order.trackingNumber && (
                <p className="text-sm mt-3">Tracking: <span className="font-mono font-semibold">{order.trackingNumber}</span></p>
              )}

              {order.status === PrintOrderStatus.DESIGN_REVIEW && order.proofUrl && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                  <p className="text-sm font-semibold">Design proof ready for approval</p>
                  <a href={order.proofUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">View proof</a>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => approve(order.id)} className="btn-primary text-sm">Approve design</button>
                    <input
                      placeholder="Rejection reason"
                      className="rounded-lg border border-border px-3 py-2 text-sm flex-1 min-w-[200px]"
                      value={rejectReason[order.id] ?? ''}
                      onChange={(e) => setRejectReason({ ...rejectReason, [order.id]: e.target.value })}
                    />
                    <button onClick={() => reject(order.id)} className="rounded-xl border border-red-300 px-4 py-2 text-sm text-red-600">Reject</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!loading && orders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted">No print orders yet</div>
          )}
        </div>
      </main>
    </PageShell>
  );
}
