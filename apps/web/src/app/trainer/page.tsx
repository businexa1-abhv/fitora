'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ClipboardCheck, FileBarChart, Users } from 'lucide-react';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { OwnerStatCard } from '@/components/owner/owner-stat-card';
import { QueryBoundary } from '@/components/query/query-boundary';
import { getTrainerDashboard } from '@/lib/training';
import { useAuthToken } from '@/hooks/use-auth-token';

export default function TrainerDashboardPage() {
  const token = useAuthToken();

  const query = useQuery({
    queryKey: ['trainer', 'dashboard'],
    queryFn: () => getTrainerDashboard(token!),
    enabled: !!token,
  });

  const dashboard = query.data;

  return (
    <div className="space-y-8">
      <OwnerPageHeader
        title="Trainer dashboard"
        description="Your batches, students, and daily tasks at a glance"
        actions={
          <Link href="/trainer/attendance" className="btn-primary">
            Mark attendance
          </Link>
        }
      />

      <QueryBoundary
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error as Error}
        onRetry={() => query.refetch()}
      >
        {dashboard && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <OwnerStatCard label="My batches" value={String(dashboard.batchCount)} icon={Users} />
              <OwnerStatCard
                label="Active students"
                value={String(dashboard.activeStudents)}
                icon={Users}
              />
              <OwnerStatCard
                label="Marked today"
                value={String(dashboard.attendanceMarkedToday)}
                icon={ClipboardCheck}
              />
              <OwnerStatCard
                label="Pending attendance"
                value={String(dashboard.pendingAttendance)}
                change={dashboard.pendingAttendance > 0 ? 'Needs attention' : 'All caught up'}
                icon={ClipboardCheck}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <h2 className="font-bold">My batches</h2>
                  <Link
                    href="/trainer/schedule"
                    className="text-sm text-primary font-medium flex items-center gap-1 hover:underline"
                  >
                    View schedule <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="divide-y divide-border">
                  {dashboard.batches.length === 0 && (
                    <p className="px-6 py-8 text-sm text-muted text-center">No batches assigned yet</p>
                  )}
                  {dashboard.batches.slice(0, 5).map((batch) => (
                    <div key={batch.id} className="px-6 py-4">
                      <p className="font-medium text-sm">{batch.name}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {batch.program?.name} · {batch.schedule}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {batch.enrollments?.length ?? 0} active students
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-4">
                <h2 className="font-bold">Quick actions</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/trainer/attendance"
                    className="rounded-xl border border-border p-4 hover:border-primary hover:bg-primary-light/20 transition-colors"
                  >
                    <ClipboardCheck className="h-5 w-5 text-primary mb-2" />
                    <p className="font-semibold text-sm">Attendance</p>
                    <p className="text-xs text-muted mt-1">Mark present or absent</p>
                  </Link>
                  <Link
                    href="/trainer/progress"
                    className="rounded-xl border border-border p-4 hover:border-primary hover:bg-primary-light/20 transition-colors"
                  >
                    <FileBarChart className="h-5 w-5 text-primary mb-2" />
                    <p className="font-semibold text-sm">Progress reports</p>
                    <p className="text-xs text-muted mt-1">Write and publish reports</p>
                  </Link>
                  <Link
                    href="/trainer/notes"
                    className="rounded-xl border border-border p-4 hover:border-primary hover:bg-primary-light/20 transition-colors"
                  >
                    <p className="font-semibold text-sm">Training notes</p>
                    <p className="text-xs text-muted mt-1">Session observations</p>
                  </Link>
                  <Link
                    href="/trainer/leave"
                    className="rounded-xl border border-border p-4 hover:border-primary hover:bg-primary-light/20 transition-colors"
                  >
                    <p className="font-semibold text-sm">Leave requests</p>
                    <p className="text-xs text-muted mt-1">Submit time off</p>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </QueryBoundary>
    </div>
  );
}
