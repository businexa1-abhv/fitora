'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  Lock,
  Upload,
  XCircle,
} from 'lucide-react';
import { PrintOrderStatus } from '@fitora/shared';
import { QueryBoundary } from '@/components/query/query-boundary';
import { getPrinterOrders, updatePrintOrderStatus } from '@/lib/print';
import { useAuthToken } from '@/hooks/use-auth-token';

export default function PrinterProofsInner() {
  const token = useAuthToken();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(searchParams.get('orderId'));
  const [proofUrl, setProofUrl] = useState('');
  const [notes, setNotes] = useState('');

  const ordersQuery = useQuery({
    queryKey: ['printer', 'orders'],
    queryFn: () => getPrinterOrders(token!),
    enabled: !!token,
  });

  const proofOrders = useMemo(() => {
    const list = ordersQuery.data ?? [];
    return list.filter(
      (o) =>
        o.status === PrintOrderStatus.ACCEPTED ||
        o.status === PrintOrderStatus.DESIGN_REVIEW ||
        !!o.proofUrl,
    );
  }, [ordersQuery.data]);

  useEffect(() => {
    const fromQuery = searchParams.get('orderId');
    if (fromQuery) {
      setActiveId(fromQuery);
      return;
    }
    if (!activeId && proofOrders[0]) setActiveId(proofOrders[0].id);
  }, [searchParams, proofOrders, activeId]);

  const order = proofOrders.find((o) => o.id === activeId) ?? null;

  useEffect(() => {
    if (order?.proofUrl) setProofUrl(order.proofUrl);
    else setProofUrl('');
  }, [order?.id, order?.proofUrl]);

  const statusMutation = useMutation({
    mutationFn: (data: {
      orderId: string;
      status: string;
      proofUrl?: string;
      providerNotes?: string;
    }) =>
      updatePrintOrderStatus(token!, data.orderId, {
        status: data.status,
        proofUrl: data.proofUrl,
        providerNotes: data.providerNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printer', 'orders'] });
      setNotes('');
    },
  });

  const idx = order ? proofOrders.findIndex((o) => o.id === order.id) : -1;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Production · Proof Management
        </p>
        <h1 className="mt-1 text-2xl font-bold">Proof Management</h1>
      </div>

      <QueryBoundary
        isLoading={ordersQuery.isLoading}
        isError={ordersQuery.isError}
        error={ordersQuery.error as Error}
        onRetry={() => ordersQuery.refetch()}
      >
        {proofOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-sm text-muted">No orders awaiting proof upload or review.</p>
            <Link
              href="/printer/orders"
              className="mt-4 inline-block text-sm font-bold text-[#ff6b00]"
            >
              Back to pipeline
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
            <aside className="space-y-2 rounded-2xl border border-border bg-card p-3">
              <p className="px-2 text-xs font-bold uppercase tracking-wide text-muted">Queue</p>
              {proofOrders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setActiveId(o.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-sm ${
                    o.id === activeId
                      ? 'bg-[#ffdbcc] font-bold text-[#a04100]'
                      : 'hover:bg-[#f7f4f0]'
                  }`}
                >
                  <p className="font-semibold">{o.orderNumber}</p>
                  <p className="text-xs text-muted">{o.listing?.title ?? 'Print job'}</p>
                </button>
              ))}
            </aside>

            {order && (
              <>
                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-muted">{order.orderNumber}</p>
                      <h2 className="text-xl font-bold">
                        {order.listing?.title ?? 'Premium print job'}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          order.status === PrintOrderStatus.DESIGN_REVIEW
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-[#ffdbcc] text-[#a04100]'
                        }`}
                      >
                        {order.status === PrintOrderStatus.DESIGN_REVIEW
                          ? 'Awaiting Approval'
                          : 'Needs Proof'}
                      </span>
                      {order.status === PrintOrderStatus.DESIGN_REVIEW && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] font-bold text-muted">
                          <Lock className="h-3 w-3" /> Proof Locked
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-border bg-[#1c1b1b]">
                    {proofUrl || order.designUrl ? (
                      <img
                        src={proofUrl || order.designUrl}
                        alt="Proof preview"
                        className="mx-auto max-h-[420px] w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-72 items-center justify-center text-sm text-white/60">
                        No proof image yet
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-2 text-xs text-white/70">
                      <span>Render quality: High-Res</span>
                      <a
                        href={proofUrl || order.designUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-white"
                      >
                        <Download className="h-3.5 w-3.5" /> Source File
                      </a>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4">
                    <label className="text-xs font-bold uppercase tracking-wide text-muted">
                      Proof image URL
                    </label>
                    <input
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                      placeholder="https://cdn.example.com/proof.png"
                      className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[#ff6b00]"
                    />
                    <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-muted">
                      Provider notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[#ff6b00]"
                      placeholder="Color correction, logo scaling, etc."
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={idx <= 0}
                      onClick={() => setActiveId(proofOrders[idx - 1]?.id ?? null)}
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm font-bold disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </button>
                    <button
                      type="button"
                      disabled={idx < 0 || idx >= proofOrders.length - 1}
                      onClick={() => setActiveId(proofOrders[idx + 1]?.id ?? null)}
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm font-bold disabled:opacity-40"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="ml-auto flex flex-wrap gap-2">
                      {order.status === PrintOrderStatus.ACCEPTED && (
                        <button
                          type="button"
                          disabled={statusMutation.isPending || !proofUrl.trim()}
                          onClick={() =>
                            statusMutation.mutate({
                              orderId: order.id,
                              status: PrintOrderStatus.DESIGN_REVIEW,
                              proofUrl: proofUrl.trim(),
                              providerNotes: notes || undefined,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff6b00] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                        >
                          <Upload className="h-4 w-4" /> Upload Proof
                        </button>
                      )}
                      {order.status === PrintOrderStatus.DESIGN_REVIEW && (
                        <>
                          <button
                            type="button"
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({
                                orderId: order.id,
                                status: PrintOrderStatus.ACCEPTED,
                                providerNotes: notes || 'Requested customer changes',
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-bold disabled:opacity-50"
                          >
                            Request Changes
                          </button>
                          <button
                            type="button"
                            disabled={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({
                                orderId: order.id,
                                status: PrintOrderStatus.CANCELLED,
                                providerNotes: notes || 'Rejected proof cycle',
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {order.status === PrintOrderStatus.DESIGN_REVIEW && (
                    <p className="inline-flex items-center gap-2 text-sm text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Waiting for customer to approve this proof in the FitOra app.
                    </p>
                  )}
                </section>

                <aside className="space-y-4">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted" />
                      <h3 className="font-bold">Version History</h3>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Last update:{' '}
                      {new Date(order.updatedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <ul className="mt-4 space-y-3">
                      <li className="rounded-xl border border-[#ff6b00] bg-[#ffdbcc]/40 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold">Current</p>
                          <p className="text-[10px] text-muted">
                            {new Date(order.updatedAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {order.providerNotes ||
                            (order.proofUrl
                              ? 'Proof submitted for customer approval.'
                              : 'Awaiting proof upload.')}
                        </p>
                      </li>
                      <li className="rounded-xl border border-border px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold">Design</p>
                          <p className="text-[10px] text-muted">
                            {new Date(order.createdAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          Customer design uploaded with order.
                        </p>
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <h3 className="font-bold">Discussion</h3>
                    <p className="mt-2 text-sm text-muted">
                      Customer notes: {order.customerNotes || 'None'}
                    </p>
                    {order.providerNotes && (
                      <p className="mt-2 rounded-xl bg-[#f7f4f0] px-3 py-2 text-sm">
                        Provider: {order.providerNotes}
                      </p>
                    )}
                  </div>
                </aside>
              </>
            )}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
