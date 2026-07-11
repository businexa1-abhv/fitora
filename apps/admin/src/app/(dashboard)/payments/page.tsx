'use client';

import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import {
  PAYMENT_ENTITY_LABELS,
  PAYMENT_STATUS_LABELS,
  PaymentEntityType,
  PaymentStatus,
  type PaymentRecord,
} from '@fitora/shared';
import { PageHeader } from '@/components/admin/page-header';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAccessToken } from '@/lib/auth';
import { getAdminPayments, getPaymentReports } from '@/lib/payments';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    Promise.all([getAdminPayments(token, { search: search || undefined }), getPaymentReports(token)])
      .then(([list, reports]) => {
        setPayments(list.items);
        setTotalRevenue(reports.summary.totalRevenue);
        setPending(reports.summary.pendingCount);
      })
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Razorpay transactions across bookings, store, services & more"
        searchPlaceholder="Search by email or Razorpay ID…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total revenue (30d)" value={formatCurrency(totalRevenue)} icon={Wallet} changeType="positive" change="Paid transactions" />
        <StatCard label="Pending payments" value={String(pending)} icon={Wallet} changeType="neutral" />
        <StatCard label="Transactions shown" value={String(payments.length)} icon={Wallet} />
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-muted text-sm">Loading payments…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Razorpay</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.user ? `${p.user.firstName} ${p.user.lastName}` : p.userId.slice(0, 8)}
                    {p.user?.email && <p className="text-xs text-muted">{p.user.email}</p>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {PAYMENT_ENTITY_LABELS[p.entityType as PaymentEntityType] ?? p.entityType}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(Number(p.amount))}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.razorpayPaymentId?.slice(0, 12) ?? p.razorpayOrderId?.slice(0, 12) ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(p.createdAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={PAYMENT_STATUS_LABELS[p.status as PaymentStatus] ?? p.status} />
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted py-8">
                    No payments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
