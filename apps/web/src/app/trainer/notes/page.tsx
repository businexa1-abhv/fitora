'use client';

import { useEffect, useState } from 'react';
import type { TrainingBatch, TrainingNote } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { getAccessToken } from '@/lib/auth';
import { createTrainingNote, deleteTrainingNote, listTrainingNotes } from '@/lib/trainer';
import { formatDate, todayString } from '@/lib/trainer-utils';
import { getTrainerBatches } from '@/lib/training';

export default function TrainerNotesPage() {
  const [notes, setNotes] = useState<TrainingNote[]>([]);
  const [batches, setBatches] = useState<TrainingBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchId, setBatchId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sessionDate, setSessionDate] = useState(todayString());
  const [submitting, setSubmitting] = useState(false);

  async function loadNotes() {
    const token = getAccessToken();
    if (!token) return;
    const data = await listTrainingNotes(token, batchId ? { batchId } : undefined);
    setNotes(data);
  }

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    Promise.all([listTrainingNotes(token), getTrainerBatches(token)])
      .then(([noteList, batchList]) => {
        setNotes(noteList);
        setBatches(batchList);
        if (batchList[0]) setBatchId(batchList[0].id);
      })
      .catch(() => {
        setNotes([]);
        setBatches([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) loadNotes().catch(() => setNotes([]));
  }, [batchId, loading]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token || !content.trim()) return;
    setSubmitting(true);
    try {
      await createTrainingNote(token, {
        batchId: batchId || undefined,
        sessionDate,
        title: title || undefined,
        content,
      });
      setTitle('');
      setContent('');
      await loadNotes();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(noteId: string) {
    const token = getAccessToken();
    if (!token) return;
    await deleteTrainingNote(token, noteId);
    await loadNotes();
  }

  return (
    <div className="space-y-6">
      <OwnerPageHeader title="Training notes" description="Session observations and coaching notes" />

      <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
        <h2 className="font-bold">Add note</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Batch</span>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Session date</span>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
          </label>
        </div>
        <input
          type="text"
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Write your training note…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
          required
        />
        <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
          {submitting ? 'Saving…' : 'Save note'}
        </button>
      </form>

      {loading && <div className="h-32 rounded-2xl skeleton" />}

      <div className="space-y-3">
        {notes.map((note) => (
          <div key={note.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{note.title || 'Untitled note'}</p>
                <p className="text-xs text-muted mt-1">
                  {note.batch?.name}
                  {note.sessionDate ? ` · ${formatDate(note.sessionDate)}` : ''}
                </p>
              </div>
              <button
                onClick={() => handleDelete(note.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
            <p className="text-sm mt-3 whitespace-pre-wrap">{note.content}</p>
          </div>
        ))}
        {!loading && notes.length === 0 && (
          <p className="text-sm text-muted text-center py-8">No notes yet</p>
        )}
      </div>
    </div>
  );
}
