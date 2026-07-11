'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ServiceOrderStatus, type ServiceOrder } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { QueryBoundary } from '@/components/query/query-boundary';
import { getProviderOrders, updateOrderStatus } from '@/lib/marketplace';
import { useAuthToken } from '@/hooks/use-auth-token';

export default function ProviderOrdersPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [tracking, setTracking] = useState<Record<string, string>>({});

  const ordersQuery = useQuery({
    queryKey: ['provider', 'orders'],
    queryFn: () => getProviderOrders(token!),
    enabled: !!token,
  });

  const statusMutation = useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: { status: string; trackingReference?: string };
    }) => updateOrderStatus(token!, orderId, data),
    onMutate: async ({ orderId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['provider', 'orders'] });
      const previous = queryClient.getQueryData<ServiceOrder[]>(['provider', 'orders']);
      queryClient.setQueryData<ServiceOrder[]>(['provider', 'orders'], (old) =>
        old?.map((o) => (o.id === orderId ? { ...o, status: data.status as ServiceOrder['status'] } : o)) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['provider', 'orders'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['provider', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['provider', 'dashboard'] });
    },
  });

  const orders = ordersQuery.data ?? [];

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Service orders"
        description="Accept bookings, update status, and add tracking references"
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
                    {order.user?.firstName} {order.user?.lastName} · {order.listing?.title}
                  </p>
                  {order.equipmentDetails && (
                    <p className="text-sm mt-2 bg-background rounded-lg p-2">{order.equipmentDetails}</p>
                  )}
                  {order.rentalStartDate && (
                    <p className="text-xs text-muted mt-1">
                      Rental: {new Date(order.rentalStartDate).toLocaleDateString()} –{' '}
                      {new Date(order.rentalEndDate!).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-primary-light text-primary px-3 py-1 text-xs font-semibold">
                  {order.status}
                </span>
              </div>

              {order.status === ServiceOrderStatus.ACCEPTED && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={statusMutation.isPending}
                    onClick={() =>
                      statusMutation.mutate({
                        orderId: order.id,
                        data: { status: ServiceOrderStatus.IN_PROGRESS },
                      })
                    }
                    className="btn-primary text-sm"
                  >
                    Start work
                  </button>
                  <button
                    type="button"
                    disabled={statusMutation.isPending}
                    onClick={() =>
                      statusMutation.mutate({
                        orderId: order.id,
                        data: { status: ServiceOrderStatus.REJECTED },
                      })
                    }
                    className="rounded-xl border border-red-300 px-4 py-2 text-sm text-red-600"
                  >
                    Reject
                  </button>
                </div>
              )}

              {order.status === ServiceOrderStatus.IN_PROGRESS && (
                <div className="flex flex-wrap gap-2 items-end">
                  <input
                    placeholder="Tracking reference (optional)"
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
                          status: ServiceOrderStatus.COMPLETED,
                          trackingReference: tracking[order.id] || undefined,
                        },
                      })
                    }
                    className="btn-primary text-sm"
                  >
                    Mark completed
                  </button>
                </div>
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
