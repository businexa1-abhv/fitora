'use client';

import React from 'react';

import { useEffect, useState } from 'react';
import { Star, TrendingUp } from 'lucide-react';
import type { TrainerPerformance } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { OwnerStatCard } from '@/components/owner/owner-stat-card';
import { getAccessToken } from '@/lib/auth';
import { getTrainerPerformance } from '@/lib/trainer';

export default function TrainerPerformancePage(): React.JSX.Element {
  const [performance, setPerformance] = useState<TrainerPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    getTrainerPerformance(token)
      .then(setPerformance)
      .catch(() => setPerformance(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Performance"
        description="Your coaching metrics and attendance trends"
      />

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl skeleton" />
          ))}
        </div>
      )}

      {performance && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <OwnerStatCard
              label="Attendance rate"
              value={`${performance.attendanceRate}%`}
              change={`${performance.presentCount} present · ${performance.absentCount} absent`}
              icon={TrendingUp}
            />
            <OwnerStatCard
              label="Active students"
              value={String(performance.activeStudents)}
              change={`${performance.batchCount} batches`}
              icon={TrendingUp}
            />
            <OwnerStatCard
              label="Sessions marked"
              value={String(performance.sessionsMarked)}
              icon={TrendingUp}
            />
            <OwnerStatCard
              label="Progress reports"
              value={String(performance.progressReportsWritten)}
              icon={TrendingUp}
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-bold mb-4">Profile metrics</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-muted font-semibold">Average rating</p>
                <p className="text-2xl font-bold mt-1 flex items-center gap-1">
                  {performance.averageRating ?? '—'}
                  {performance.averageRating && <Star className="h-5 w-5 text-amber-500 fill-amber-500" />}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted font-semibold">Experience</p>
                <p className="text-2xl font-bold mt-1">
                  {performance.yearsExperience ?? '—'}
                  {performance.yearsExperience != null && (
                    <span className="text-sm font-normal text-muted ml-1">years</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted font-semibold">Verification</p>
                <p className="text-2xl font-bold mt-1">
                  {performance.isVerified ? 'Verified' : 'Pending'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-bold mb-4">Leave summary</h2>
            <div className="flex flex-wrap gap-6 text-sm">
              <span>Pending: {performance.leaveRequests.pending}</span>
              <span>Approved: {performance.leaveRequests.approved}</span>
              <span>Rejected: {performance.leaveRequests.rejected}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
