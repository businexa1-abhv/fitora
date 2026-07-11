'use client';

import { useEffect, useState } from 'react';
import type { ShopOrder } from '@fitora/shared';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAccessToken } from '@/lib/auth';
import { getAdminOrders, updateOrderStatus } from '@/lib/shop';
import { formatCurrency } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ShopOrdersPage() {
  const [orders, setOrders] = useState<(ShopOrder & { user?: { firstName: string; lastName: string; email: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState<Record<string, string>>({});

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    const data = await getAdminOrders(token);
    setOrders(data);
  }

  useEffect(() => {
    load()
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  async function markShipped(orderId: string) {
    const token = getAccessToken();
    if (!token) return;
    await updateOrderStatus(token, orderId, {
      status: 'SHIPPED',
      trackingNumber: tracking[orderId] || undefined,
    });
    await load();
  }

  return (
    <div>
      <PageHeader title="Shop orders" description="Fulfillment and order tracking" />

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <p className="font-medium">{o.orderNumber ?? o.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{o.items.length} items</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{o.user?.firstName} {o.user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{o.user?.email}</p>
                  </TableCell>
                  <TableCell>{formatCurrency(Number(o.totalAmount))}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell>
                    <Input
                      placeholder="Tracking #"
                      className="h-8 w-36"
                      value={tracking[o.id] ?? o.trackingNumber ?? ''}
                      onChange={(e) => setTracking({ ...tracking, [o.id]: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    {o.status === 'CONFIRMED' && (
                      <Button size="sm" variant="outline" onClick={() => markShipped(o.id)}>
                        Mark shipped
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
