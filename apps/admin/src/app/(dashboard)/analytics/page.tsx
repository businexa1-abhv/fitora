'use client';

import dynamic from 'next/dynamic';

const AnalyticsDashboard = dynamic(
  () => import('./analytics-dashboard').then((m) => m.AnalyticsDashboard),
  {
    loading: () => (
      <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
        Loading analytics…
      </div>
    ),
    ssr: false,
  },
);

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
