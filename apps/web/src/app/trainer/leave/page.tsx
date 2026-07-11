'use client';

import { useEffect, useState } from 'react';
import { LeaveRequestStatus, type LeaveRequest } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { OwnerStatusBadge } from '@/components/owner/owner-status-badge';
import { getAccessToken } from '@/lib/auth';
import { cancelLeaveRequest, createLeaveRequest, listLeaveRequests } from '@/lib/trainer';
import { formatDate, todayString } from '@/lib/trainer-utils';

export default function TrainerLeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(todayString());
  const [endDate, setEndDate] = useState(todayString());
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    const data = await listLeaveRequests(token);
    setRequests(data);
  }

  useEffect(() => {
    load()
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;
    setSubmitting(true);
    try {
      await createLeaveRequest(token, { startDate, endDate, reason });
      setReason('');
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id: string) {
    const token = getAccessToken();
    if (!token) return;
    await cancelLeaveRequest(token, id);
    await load();
  }

  return (
    <div className="space-y-6">
      <OwnerPageHeader title="Leave requests" description="Submit and track your time-off requests" />

      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <h2 className="font-bold">Request leave</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Start date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">End date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              required
            />
          </label>
        </div>
        <textarea
          placeholder="Reason for leave…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
          required
        />
        <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
      </form>

      {loading && <div className="h-32 rounded-2xl skeleton" />}

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-bold">Your requests</h2>
        </div>
        <div className="divide-y divide-border">
          {requests.length === 0 && !loading && (
            <p className="px-6 py-8 text-sm text-muted text-center">No leave requests yet</p>
          )}
          {requests.map((req) => (
            <div key={req.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
              <div>
                <p className="font-medium text-sm">
                  {formatDate(req.startDate)} – {formatDate(req.endDate)}
                </p>
                <p className="text-xs text-muted mt-1 max-w-xl">{req.reason}</p>
                {req.reviewNote && (
                  <p className="text-xs text-muted mt-1">Review: {req.reviewNote}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <OwnerStatusBadge status={req.status} />
                {req.status === LeaveRequestStatus.PENDING && (
                  <button
                    onClick={() => handleCancel(req.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
