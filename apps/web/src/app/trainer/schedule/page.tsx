'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import type { TrainerScheduleItem } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { getAccessToken } from '@/lib/auth';
import { getTrainerSchedule } from '@/lib/trainer';
import { formatDate } from '@/lib/trainer-utils';

export default function TrainerSchedulePage() {
  const [items, setItems] = useState<TrainerScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    getTrainerSchedule(token)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Schedule"
        description="Your assigned training batches and session timings"
      />

      {loading && <div className="h-40 rounded-2xl skeleton" />}

      {!loading && items.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
          <CalendarDays className="h-10 w-10 text-muted mx-auto mb-3" />
          <p className="font-semibold">No scheduled batches</p>
          <p className="text-sm text-muted mt-1">Contact the court owner for batch assignments</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <div key={item.batchId} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold">{item.batchName}</h2>
                <p className="text-sm text-muted mt-0.5">{item.program.name}</p>
              </div>
              <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                {item.activeStudents}/{item.maxCapacity} students
              </span>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                {item.schedule}
              </p>
              <p className="flex items-center gap-2 text-muted">
                <MapPin className="h-4 w-4 shrink-0" />
                {item.court.name}, {item.court.city}
              </p>
              {(item.startDate || item.endDate) && (
                <p className="text-xs text-muted">
                  {item.startDate ? formatDate(item.startDate) : '—'} –{' '}
                  {item.endDate ? formatDate(item.endDate) : 'ongoing'}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
