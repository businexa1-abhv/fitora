'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SportType, SPORT_LABELS } from '@fitora/shared';
import { OwnerPageHeader } from '@/components/owner/owner-page-header';
import { buttonClassName, FormField, inputClassName } from '@/components/auth-layout';
import { ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { createTrainingBatch, createTrainingProgram, getTrainers } from '@/lib/courts';

export default function CourtTrainingPage() {
  const { id: courtId } = useParams<{ id: string }>();
  const router = useRouter();
  const [trainers, setTrainers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [programId, setProgramId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [program, setProgram] = useState({
    name: '',
    description: '',
    sportType: SportType.BADMINTON,
    minAge: 5,
    maxAge: 16,
    fee: 2000,
  });

  const [batch, setBatch] = useState({
    name: '',
    schedule: '',
    trainerId: '',
    maxCapacity: 20,
  });

  useEffect(() => {
    getTrainers().then(setTrainers).catch(() => setTrainers([]));
  }, []);

  async function handleCreateProgram(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return router.push('/login');

    setLoading(true);
    setError('');
    try {
      const created = await createTrainingProgram(token, courtId, program);
      setProgramId(created.id);
      setSuccess(`Program "${created.name}" created. Now add a batch below.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBatch(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token || !programId) return;

    setLoading(true);
    setError('');
    try {
      await createTrainingBatch(token, programId, batch);
      setSuccess('Batch created! Program is live for enrollments.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link href="/owner/training" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary mb-4">
        <ArrowLeft className="h-4 w-4" />
        All training programs
      </Link>

      <OwnerPageHeader
        title="Kids training setup"
        description="Create programs and assign trainers to batches"
      />

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-primary-light border border-primary/20 px-4 py-3 text-sm text-primary font-medium mb-4">
          ✓ {success}
        </div>
      )}

      <form
        onSubmit={handleCreateProgram}
        className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-5 mb-6"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
            1
          </span>
          <h2 className="font-bold text-lg">Create program</h2>
        </div>

        <FormField label="Program name" id="pname">
          <input
            id="pname"
            required
            placeholder="e.g. Junior Badminton Academy"
            className={inputClassName}
            value={program.name}
            onChange={(e) => setProgram({ ...program, name: e.target.value })}
          />
        </FormField>

        <FormField label="Sport" id="sport">
          <select
            id="sport"
            className={inputClassName}
            value={program.sportType}
            onChange={(e) => setProgram({ ...program, sportType: e.target.value as SportType })}
          >
            {Object.entries(SPORT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Min age" id="minAge">
            <input
              id="minAge"
              type="number"
              className={inputClassName}
              value={program.minAge}
              onChange={(e) => setProgram({ ...program, minAge: Number(e.target.value) })}
            />
          </FormField>
          <FormField label="Max age" id="maxAge">
            <input
              id="maxAge"
              type="number"
              className={inputClassName}
              value={program.maxAge}
              onChange={(e) => setProgram({ ...program, maxAge: Number(e.target.value) })}
            />
          </FormField>
        </div>

        <FormField label="Fee (₹)" id="fee">
          <input
            id="fee"
            type="number"
            className={inputClassName}
            value={program.fee}
            onChange={(e) => setProgram({ ...program, fee: Number(e.target.value) })}
          />
        </FormField>

        <button type="submit" disabled={loading} className={`${buttonClassName} w-full py-3`}>
          Create program
        </button>
      </form>

      {programId && (
        <form
          onSubmit={handleCreateBatch}
          className="rounded-2xl border-2 border-primary/30 bg-card p-6 sm:p-8 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              2
            </span>
            <h2 className="font-bold text-lg">Add batch & assign trainer</h2>
          </div>

          <FormField label="Batch name" id="bname">
            <input
              id="bname"
              required
              placeholder="e.g. Morning Batch A"
              className={inputClassName}
              value={batch.name}
              onChange={(e) => setBatch({ ...batch, name: e.target.value })}
            />
          </FormField>

          <FormField label="Schedule" id="sched">
            <input
              id="sched"
              required
              placeholder="Mon, Wed, Fri 4–5 PM"
              className={inputClassName}
              value={batch.schedule}
              onChange={(e) => setBatch({ ...batch, schedule: e.target.value })}
            />
          </FormField>

          <FormField label="Trainer" id="trainer">
            <select
              id="trainer"
              required
              className={inputClassName}
              value={batch.trainerId}
              onChange={(e) => setBatch({ ...batch, trainerId: e.target.value })}
            >
              <option value="">Select trainer</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
          </FormField>

          {trainers.length === 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              No trainers registered yet. Users with the Trainer role appear here.
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !batch.trainerId}
            className={`${buttonClassName} w-full py-3`}
          >
            Create batch
          </button>
        </form>
      )}
    </div>
  );
}
