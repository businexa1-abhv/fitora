'use client';

import React from 'react';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PrintOrderStatus, type PrintOrder } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { QueryBoundary } from '@/components/query/query-boundary';
import { getPrinterOrders, updatePrintOrderStatus } from '@/lib/print';
import { useAuthToken } from '@/hooks/use-auth-token';

export default function PrinterOrdersPage(): React.JSX.Element {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [tracking, setTracking] = useState<Record<string, string>>({});

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
    onMutate: async ({ orderId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['printer', 'orders'] });
      const previous = queryClient.getQueryData<PrintOrder[]>(['printer', 'orders']);
      queryClient.setQueryData<PrintOrder[]>(['printer', 'orders'], (old) =>
        old?.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: data.status as PrintOrder['status'],
                ...(data.proofUrl ? { proofUrl: data.proofUrl } : {}),
                ...(data.trackingNumber ? { trackingNumber: data.trackingNumber } : {}),
              }
            : o,
        ) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['printer', 'orders'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['printer', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['printer', 'dashboard'] });
    },
  });

  const orders = ordersQuery.data ?? [];

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Print orders"
        description="Approve designs, update printing status, and manage delivery"
      />

      <QueryBoundary
        isLoading={ordersQuery.isLoading}
        isError={ordersQuery.isError}
        error={ordersQuery.error as Error}
        onRetry={() => ordersQuery.refetch()}
      >
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-bold">{order.orderNumber}</p>
                  <p className="text-sm text-muted">
                    {order.user?.firstName} {order.user?.lastName} · {order.quantity}x{' '}
                    {order.tshirtSize} {order.tshirtColor}
                  </p>
                  <a
                    href={order.designUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary underline mt-1 inline-block"
                  >
                    View customer design
                  </a>
                </div>
                <span className="rounded-full bg-primary-light text-primary px-3 py-1 text-xs font-semibold">
                  {order.status}
                </span>
              </div>

              {order.status === PrintOrderStatus.ACCEPTED && (
                <div className="flex flex-wrap gap-2 items-end">
                  <input
                    placeholder="Proof image URL"
                    className="rounded-xl border border-border px-3 py-2 text-sm flex-1 min-w-[200px]"
                    value={proofUrls[order.id] ?? ''}
                    onChange={(e) => setProofUrls({ ...proofUrls, [order.id]: e.target.value })}
                  />
                  <button
                    type="button"
                    disabled={statusMutation.isPending || !proofUrls[order.id]?.trim()}
                    onClick={() =>
                      statusMutation.mutate({
                        orderId: order.id,
                        data: {
                          status: PrintOrderStatus.DESIGN_REVIEW,
                          proofUrl: proofUrls[order.id].trim(),
                        },
                      })
                    }
                    className="btn-primary text-sm"
                  >
                    Send for approval
                  </button>
                </div>
              )}

              {order.status === PrintOrderStatus.IN_PRODUCTION && (
                <div className="flex flex-wrap gap-2 items-end">
                  <input
                    placeholder="Tracking number"
                    className="rounded-xl border border-border px-3 py-2 text-sm"
                    value={tracking[order.id] ?? ''}
                    onChange={(e) => setTracking({ ...tracking, [order.id]: e.target.value })}
                  />
                  <button
                    type="button"
                    disabled={statusMutation.isPending}
                    onClick={() =>
                      statusMutation.mutate({
                        orderId: order.id,
                        data: {
                          status: PrintOrderStatus.SHIPPED,
                          trackingNumber: tracking[order.id] || undefined,
                        },
                      })
                    }
                    className="btn-primary text-sm"
                  >
                    Mark shipped
                  </button>
                </div>
              )}

              {order.status === PrintOrderStatus.SHIPPED && (
                <button
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={() =>
                    statusMutation.mutate({
                      orderId: order.id,
                      data: { status: PrintOrderStatus.DELIVERED },
                    })
                  }
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
                >
                  Mark delivered
                </button>
              )}

              {order.proofUrl && order.status === PrintOrderStatus.DESIGN_REVIEW && (
                <p className="text-sm text-amber-700">Waiting for customer to approve proof</p>
              )}
            </div>
          ))}
          {orders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted">
              No incoming orders
            </div>
          )}
        </div>
      </QueryBoundary>
    </div>
  );
}
