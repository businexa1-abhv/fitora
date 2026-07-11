'use client';

import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import {
  PAYMENT_ENTITY_LABELS,
  PaymentEntityType,
  type PaymentReports,
} from '@fitora/shared';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAccessToken } from '@/lib/auth';
import { getPaymentReports } from '@/lib/payments';
import { formatCurrency } from '@/lib/utils';

export default function ReportsPage() {
  const [reports, setReports] = useState<PaymentReports | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    getPaymentReports(token).then(setReports).catch(() => setReports(null));
  }, []);

  function exportRevenueCsv() {
    if (!reports) return;
    const rows = [
      ['Entity Type', 'Label', 'Count', 'Revenue'],
      ...reports.byEntityType.map((r) => [r.entityType, r.label, String(r.count), String(r.revenue)]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fitora-revenue-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Payment analytics and revenue breakdown" />

      {reports && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total revenue</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(reports.summary.totalRevenue)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Paid</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{reports.summary.paidCount}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Failed</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{reports.summary.failedCount}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Refunded</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{reports.summary.refundedCount}</p></CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col sm:col-span-2">
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">Revenue report</CardTitle>
            <CardDescription>Payments breakdown by entity type (last {reports?.periodDays ?? 30} days)</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto space-y-3">
            {reports?.byEntityType.map((row) => (
              <div key={row.entityType} className="flex justify-between text-sm border-b border-border pb-2">
                <span>{PAYMENT_ENTITY_LABELS[row.entityType as PaymentEntityType] ?? row.label}</span>
                <span className="font-semibold">{formatCurrency(row.revenue)} ({row.count})</span>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full mt-4" onClick={exportRevenueCsv} disabled={!reports}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
