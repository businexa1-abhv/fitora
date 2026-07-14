'use client';

import React from 'react';

import { useMutation } from '@tanstack/react-query';
import { Download, FileText, Loader2 } from 'lucide-react';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { exportOwnerReport } from '@/lib/owner-analytics';
import { useAuthToken } from '@/hooks/use-auth-token';

const REPORTS = [
  {
    title: 'Booking report',
    desc: 'All bookings by court, date, and status',
    period: 'Last 30 days',
    metric: 'bookings',
  },
  {
    title: 'Revenue report',
    desc: 'Earnings breakdown by source and court',
    period: 'Last 30 days',
    metric: 'revenue',
  },
  {
    title: 'Membership report',
    desc: 'Active subscribers and churn',
    period: 'Last 30 days',
    metric: 'overview',
  },
  {
    title: 'Training report',
    desc: 'Enrollments, attendance, and fees',
    period: 'Last 30 days',
    metric: 'overview',
  },
  {
    title: 'Slot utilization',
    desc: 'Occupancy rates by court and time',
    period: 'Last 7 days',
    metric: 'overview',
  },
  {
    title: 'Payout summary',
    desc: 'Settlements and pending payouts',
    period: 'This month',
    metric: 'overview',
  },
] as const;

export default function OwnerReportsPage(): React.JSX.Element {
  const token = useAuthToken();

  const exportMutation = useMutation({
    mutationFn: async (metric: string) => {
      if (!token) throw new Error('Not authenticated');
      const blob = await exportOwnerReport(token, metric, { period: 'monthly' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fitora-owner-${metric}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  return (
    <div>
      <OwnerPageHeader title="Reports" description="Download operational reports for your venues" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => {
          const isExporting =
            exportMutation.isPending && exportMutation.variables === report.metric;

          return (
            <div
              key={report.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light mb-4">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold">{report.title}</h3>
              <p className="text-sm text-muted mt-1 flex-1">{report.desc}</p>
              <p className="text-xs text-muted mt-3 mb-4">{report.period}</p>
              <button
                type="button"
                className="btn-outline w-full flex items-center justify-center gap-2 disabled:opacity-50"
                disabled={exportMutation.isPending || !token}
                onClick={() => exportMutation.mutate(report.metric)}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export CSV
              </button>
              {exportMutation.isError && exportMutation.variables === report.metric && (
                <p className="text-xs text-red-600 mt-2">{exportMutation.error.message}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
