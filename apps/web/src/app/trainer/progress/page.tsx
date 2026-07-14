'use client';

import React from 'react';

import { useEffect, useState } from 'react';
import { EnrollmentStatus, type TrainingBatch } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { getAccessToken } from '@/lib/auth';
import { createProgressReport, getTrainerBatches, publishProgressReport } from '@/lib/training';
import { todayString } from '@/lib/trainer-utils';

export default function TrainerProgressPage(): React.JSX.Element {
  const [batches, setBatches] = useState<TrainingBatch[]>([]);
  const [enrollmentId, setEnrollmentId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState(todayString());
  const [summary, setSummary] = useState('');
  const [rating, setRating] = useState(4);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    getTrainerBatches(token)
      .then((list) => {
        setBatches(list);
        const first = list
          .flatMap((b) => b.enrollments ?? [])
          .find((e) => e.status === EnrollmentStatus.ACTIVE);
        if (first) setEnrollmentId(first.id);
      })
      .catch(() => setBatches([]))
      .finally(() => setLoading(false));
  }, []);

  const students = batches.flatMap((b) =>
    (b.enrollments ?? [])
      .filter((e) => e.status === EnrollmentStatus.ACTIVE)
      .map((e) => ({
        id: e.id,
        label: `${e.kid?.firstName} ${e.kid?.lastName} (${b.name})`,
      })),
  );

  async function handleSubmit(e: React.FormEvent, publish: boolean) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token || !enrollmentId || !summary.trim()) return;
    setSubmitting(true);
    setMessage('');
    try {
      const report = await createProgressReport(token, {
        enrollmentId,
        periodStart: periodStart || periodEnd,
        periodEnd,
        summary,
        rating,
        publish,
      });
      if (publish && report.id) {
        await publishProgressReport(token, report.id);
      }
      setMessage(publish ? 'Report published to parent' : 'Report saved as draft');
      setSummary('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save report');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Progress reports"
        description="Create and publish student progress reports for parents"
      />

      {loading && <div className="h-40 rounded-2xl skeleton" />}

      {!loading && students.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
          <p className="font-semibold">No active students</p>
        </div>
      )}

      {students.length > 0 && (
        <form className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <label className="block text-sm">
            <span className="font-medium">Student</span>
            <select
              value={enrollmentId}
              onChange={(e) => setEnrollmentId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Period start</span>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Period end</span>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="font-medium">Overall rating (1–5)</span>
            <input
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="mt-1 w-24 rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
          </label>

          <textarea
            placeholder="Summary of progress, strengths, and areas to improve…"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            required
          />

          {message && <p className="text-sm text-primary font-medium">{message}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={(e) => handleSubmit(e, false)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={(e) => handleSubmit(e, true)}
              className="btn-primary disabled:opacity-60"
            >
              Publish to parent
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
