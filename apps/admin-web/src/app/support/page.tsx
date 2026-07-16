'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AdminShell, primaryBtnClass, secondaryBtnClass } from '@/components/admin-shell';
import { adminApi, getAccessToken, type SupportTicket } from '@/lib/api';

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

function statusBadge(status: SupportTicket['status']) {
  const styles: Record<SupportTicket['status'], string> = {
    OPEN: 'bg-error/10 text-error',
    IN_PROGRESS: 'bg-info/10 text-info',
    RESOLVED: 'bg-secondary/10 text-secondary',
    CLOSED: 'bg-surface-high text-muted',
  };
  return styles[status];
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    void adminApi
      .listSupportTickets(token)
      .then((res) => setTickets(res.items))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.createSupportTicket(token, {
        subject,
        body,
        requesterName,
        requesterEmail,
      });
      setSubject('');
      setBody('');
      setRequesterName('');
      setRequesterEmail('');
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id: string, status: SupportTicket['status']) {
    const token = getAccessToken();
    if (!token) return;
    try {
      await adminApi.updateSupportTicket(token, id, { status });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket');
    }
  }

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Support Queue</h1>
          <p className="mt-1 text-sm text-muted">Escalated partner and player tickets.</p>
        </div>
        <button type="button" className={primaryBtnClass} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'New Ticket'}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-8 space-y-4 rounded-3xl border border-border bg-card p-6"
        >
          <h2 className="font-display text-lg font-semibold">Create Ticket</h2>
          <input
            className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <textarea
            className="min-h-24 w-full rounded-2xl border border-border px-4 py-2.5 text-sm"
            placeholder="Description"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-2xl border border-border px-4 py-2.5 text-sm"
              placeholder="Requester name"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              required
            />
            <input
              type="email"
              className="rounded-2xl border border-border px-4 py-2.5 text-sm"
              placeholder="Requester email"
              value={requesterEmail}
              onChange={(e) => setRequesterEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className={primaryBtnClass} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Ticket'}
          </button>
        </form>
      )}

      {loading && <p className="text-sm text-muted">Loading tickets…</p>}

      <div className="space-y-3">
        {!loading && tickets.length === 0 && (
          <p className="rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted">
            No support tickets yet.
          </p>
        )}
        {tickets.map((ticket) => (
          <article key={ticket.id} className="rounded-2xl border border-border bg-card px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{ticket.subject}</p>
                <p className="mt-1 text-xs text-muted">
                  {ticket.requesterName} · {ticket.requesterEmail}
                  {ticket.tenant ? ` · ${ticket.tenant.name}` : ''}
                </p>
                <p className="mt-2 text-sm text-muted">{ticket.body}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadge(ticket.status)}`}
              >
                {ticket.status.replace('_', ' ')}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUS_OPTIONS.filter((s) => s !== ticket.status).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={secondaryBtnClass}
                  onClick={() => updateStatus(ticket.id, status)}
                >
                  Mark {status.replace('_', ' ').toLowerCase()}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
