'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, LayoutGrid, List, Paperclip } from 'lucide-react';
import { PrintOrderStatus, type PrintOrder } from '@fitora/shared';
import { QueryBoundary } from '@/components/query/query-boundary';
import { getPrinterOrders, updatePrintOrderStatus } from '@/lib/print';
import { useAuthToken } from '@/hooks/use-auth-token';

type ColumnId = 'accepted' | 'design' | 'production' | 'shipped' | 'delivered';

const COLUMNS: {
  id: ColumnId;
  title: string;
  statuses: PrintOrderStatus[];
  accent: string;
}[] = [
  {
    id: 'accepted',
    title: 'Accepted',
    statuses: [PrintOrderStatus.ACCEPTED],
    accent: 'border-t-[#ff6b00]',
  },
  {
    id: 'design',
    title: 'Proofing',
    statuses: [PrintOrderStatus.DESIGN_REVIEW],
    accent: 'border-t-[#3d4f6f]',
  },
  {
    id: 'production',
    title: 'In Progress',
    statuses: [PrintOrderStatus.IN_PRODUCTION],
    accent: 'border-t-[#ff6b00]',
  },
  {
    id: 'shipped',
    title: 'Shipped',
    statuses: [PrintOrderStatus.SHIPPED],
    accent: 'border-t-emerald-500',
  },
  {
    id: 'delivered',
    title: 'Delivered',
    statuses: [PrintOrderStatus.DELIVERED],
    accent: 'border-t-slate-400',
  },
];

function isOverdue(order: PrintOrder) {
  const created = new Date(order.createdAt).getTime();
  const days = (Date.now() - created) / 86400000;
  return (
    days > 5 &&
    order.status !== PrintOrderStatus.DELIVERED &&
    order.status !== PrintOrderStatus.CANCELLED &&
    order.status !== PrintOrderStatus.SHIPPED
  );
}

function deadlineLabel(order: PrintOrder) {
  const d = new Date(order.createdAt);
  d.setDate(d.getDate() + 5);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PrinterOrdersPipelinePage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const ordersQuery = useQuery({
    queryKey: ['printer', 'orders'],
    queryFn: () => getPrinterOrders(token!),
    enabled: !!token,
  });

  const statusMutation = useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: { status: string; proofUrl?: string; trackingNumber?: string };
    }) => updatePrintOrderStatus(token!, orderId, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['printer', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['printer', 'dashboard'] });
    },
  });

  const orders = useMemo(
    () => (ordersQuery.data ?? []).filter((o) => o.status !== PrintOrderStatus.CANCELLED),
    [ordersQuery.data],
  );

  const byColumn = useMemo(() => {
    const map: Record<ColumnId, PrintOrder[]> = {
      accepted: [],
      design: [],
      production: [],
      shipped: [],
      delivered: [],
    };
    for (const order of orders) {
      const col = COLUMNS.find((c) => c.statuses.includes(order.status));
      if (col) map[col.id].push(order);
    }
    return map;
  }, [orders]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Production Pipeline</h1>
          <p className="mt-1 text-sm text-muted">
            Real-time status of {orders.length} active high-performance orders.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setView('kanban')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                view === 'kanban' ? 'bg-[#ff6b00] text-white' : 'text-muted'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                view === 'list' ? 'bg-[#ff6b00] text-white' : 'text-muted'
              }`}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>
          {selected.size > 0 && (
            <span className="rounded-lg bg-[#ffdbcc] px-3 py-1.5 text-xs font-bold text-[#a04100]">
              {selected.size} selected
            </span>
          )}
        </div>
      </div>

      <QueryBoundary
        isLoading={ordersQuery.isLoading}
        isError={ordersQuery.isError}
        error={ordersQuery.error as Error}
        onRetry={() => ordersQuery.refetch()}
      >
        {view === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((col) => (
              <div
                key={col.id}
                className={`min-w-[260px] flex-1 rounded-2xl border border-border border-t-4 bg-[#f7f4f0] ${col.accent}`}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <h2 className="text-sm font-bold">{col.title}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-muted">
                    {byColumn[col.id].length}
                  </span>
                </div>
                <div className="space-y-3 px-3 pb-3">
                  {byColumn[col.id].map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      selected={selected.has(order.id)}
                      onToggle={() => toggleSelect(order.id)}
                      onAdvance={(status, extra) =>
                        statusMutation.mutate({
                          orderId: order.id,
                          data: { status, ...extra },
                        })
                      }
                      busy={statusMutation.isPending}
                    />
                  ))}
                  {byColumn[col.id].length === 0 && (
                    <p className="rounded-xl border border-dashed border-border bg-white/60 px-3 py-6 text-center text-xs text-muted">
                      No jobs
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f4f0] text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Deadline</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#faf8f5]">
                    <td className="px-4 py-3 font-semibold">{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      {order.user?.firstName} {order.user?.lastName}
                    </td>
                    <td className="px-4 py-3">{order.quantity}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#ffdbcc] px-2 py-0.5 text-[10px] font-bold text-[#a04100]">
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{deadlineLabel(order)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/printer/proofs?orderId=${order.id}`}
                        className="text-xs font-bold text-[#ff6b00]"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}

function OrderCard({
  order,
  selected,
  onToggle,
  onAdvance,
  busy,
}: {
  order: PrintOrder;
  selected: boolean;
  onToggle: () => void;
  onAdvance: (status: string, extra?: { proofUrl?: string; trackingNumber?: string }) => void;
  busy: boolean;
}) {
  const overdue = isOverdue(order);
  const initials =
    `${order.user?.firstName?.[0] ?? 'C'}${order.user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div
      className={`rounded-xl border bg-white p-3 shadow-sm ${
        selected ? 'border-[#ff6b00]' : 'border-border'
      } ${overdue ? 'ring-1 ring-red-300' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={selected} onChange={onToggle} className="rounded" />
          <span className="text-xs font-bold text-muted">{order.orderNumber}</span>
        </label>
        {overdue ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
            <AlertTriangle className="h-3 w-3" /> OVERDUE
          </span>
        ) : order.status === PrintOrderStatus.DESIGN_REVIEW ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            Review
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            Standard
          </span>
        )}
      </div>
      <p className="mt-2 text-sm font-bold leading-snug">
        {order.listing?.title ?? 'Custom print job'}
      </p>
      <p className="mt-1 text-xs text-muted">
        Customer: {order.user?.firstName} {order.user?.lastName}
      </p>
      <p className="text-xs text-muted">
        Qty: {order.quantity} · {order.tshirtSize} {order.tshirtColor}
      </p>
      <p className="mt-2 text-[11px] font-semibold text-muted">Deadline: {deadlineLabel(order)}</p>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ffdbcc] text-[10px] font-bold text-[#a04100]">
            {initials}
          </span>
          {(order.designUrl || order.proofUrl) && <Paperclip className="h-3.5 w-3.5 text-muted" />}
        </div>
        <div className="flex gap-1">
          {order.status === PrintOrderStatus.ACCEPTED && (
            <Link
              href={`/printer/proofs?orderId=${order.id}`}
              className="rounded-lg bg-[#ff6b00] px-2 py-1 text-[10px] font-bold text-white"
            >
              Proof
            </Link>
          )}
          {order.status === PrintOrderStatus.DESIGN_REVIEW && (
            <Link
              href={`/printer/proofs?orderId=${order.id}`}
              className="rounded-lg border border-border px-2 py-1 text-[10px] font-bold"
            >
              Manage
            </Link>
          )}
          {order.status === PrintOrderStatus.IN_PRODUCTION && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAdvance(PrintOrderStatus.SHIPPED)}
              className="rounded-lg bg-[#ff6b00] px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50"
            >
              Ship
            </button>
          )}
          {order.status === PrintOrderStatus.SHIPPED && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAdvance(PrintOrderStatus.DELIVERED)}
              className="rounded-lg border border-border px-2 py-1 text-[10px] font-bold disabled:opacity-50"
            >
              Deliver
            </button>
          )}
        </div>
      </div>
      {order.status === PrintOrderStatus.DESIGN_REVIEW && (
        <p className="mt-2 text-[11px] font-semibold text-amber-700">Awaiting customer approval</p>
      )}
    </div>
  );
}
