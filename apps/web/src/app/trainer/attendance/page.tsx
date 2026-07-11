'use client';

import { useEffect, useState } from 'react';
import { EnrollmentStatus, type TrainingBatch } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { getAccessToken } from '@/lib/auth';
import { getBatchAttendanceForDate } from '@/lib/trainer';
import { todayString } from '@/lib/trainer-utils';
import { getTrainerBatches, markBatchAttendance } from '@/lib/training';

export default function TrainerAttendancePage() {
  const [batches, setBatches] = useState<TrainingBatch[]>([]);
  const [date, setDate] = useState(todayString());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Record<string, 'present' | 'absent'>>({});

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    getTrainerBatches(token)
      .then(setBatches)
      .catch(() => setBatches([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !batches.length) return;

    Promise.all(
      batches.map((batch) =>
        getBatchAttendanceForDate(token, batch.id, date).then((data) => ({ batchId: batch.id, data })),
      ),
    ).then((results) => {
      const nextMarked: Record<string, 'present' | 'absent'> = {};
      const nextNotes: Record<string, string> = {};
      for (const { data } of results) {
        for (const row of data.enrollments) {
          if (row.record) {
            nextMarked[row.enrollmentId] = row.record.present ? 'present' : 'absent';
            if (row.record.notes) nextNotes[row.enrollmentId] = row.record.notes;
          }
        }
      }
      setMarked(nextMarked);
      setNotes(nextNotes);
    });
  }, [batches, date]);

  async function saveBatch(batch: TrainingBatch) {
    const token = getAccessToken();
    if (!token) return;

    const active = batch.enrollments?.filter((e) => e.status === EnrollmentStatus.ACTIVE) ?? [];
    const records = active
      .filter((e) => marked[e.id])
      .map((e) => ({
        enrollmentId: e.id,
        present: marked[e.id] === 'present',
        notes: notes[e.id],
      }));

    if (!records.length) return;

    setSaving(batch.id);
    try {
      await markBatchAttendance(token, batch.id, { date, records });
    } finally {
      setSaving(null);
    }
  }

  function toggle(enrollmentId: string, present: boolean) {
    setMarked((prev) => ({ ...prev, [enrollmentId]: present ? 'present' : 'absent' }));
  }

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Attendance"
        description="Mark daily attendance for your batches"
        actions={
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        }
      />

      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl skeleton" />
          ))}
        </div>
      )}

      {!loading && batches.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
          <p className="font-semibold">No batches assigned</p>
        </div>
      )}

      <div className="space-y-6">
        {batches.map((batch) => {
          const active = batch.enrollments?.filter((e) => e.status === EnrollmentStatus.ACTIVE) ?? [];
          return (
            <div key={batch.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary-light/40 px-6 py-4">
                <div>
                  <h2 className="font-bold">{batch.name}</h2>
                  <p className="text-sm text-muted">{batch.program?.name}</p>
                </div>
                <button
                  onClick={() => saveBatch(batch)}
                  disabled={saving === batch.id}
                  className="btn-primary text-sm disabled:opacity-60"
                >
                  {saving === batch.id ? 'Saving…' : 'Save batch'}
                </button>
              </div>

              <div className="p-6 space-y-3">
                {active.length === 0 && (
                  <p className="text-sm text-muted">No active enrollments</p>
                )}
                {active.map((e) => (
                  <div
                    key={e.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
                      marked[e.id] === 'present'
                        ? 'border-primary bg-primary-light/30'
                        : marked[e.id] === 'absent'
                          ? 'border-red-200 bg-red-50/50'
                          : 'border-border'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">
                        {e.kid?.firstName} {e.kid?.lastName}
                      </p>
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        className="mt-2 text-xs border border-border rounded-lg px-2.5 py-1.5 w-full max-w-xs bg-card outline-none focus:border-primary"
                        value={notes[e.id] ?? ''}
                        onChange={(ev) => setNotes({ ...notes, [e.id]: ev.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggle(e.id, true)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold ${
                          marked[e.id] === 'present' ? 'bg-primary text-primary-foreground' : 'bg-primary-light text-primary'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => toggle(e.id, false)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold ${
                          marked[e.id] === 'absent' ? 'bg-red-500 text-white' : 'border border-border'
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
