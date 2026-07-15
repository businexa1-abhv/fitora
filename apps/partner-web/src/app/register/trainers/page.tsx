'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, partnerApi, type TrainerInput } from '@/lib/api';
import { useOnboarding } from '@/components/onboarding-provider';
import {
  PartnerFooter,
  RegisterHeader,
  RegisterStepper,
  fieldClass,
  labelClass,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/components/partner-ui';

const EMPTY_TRAINER: TrainerInput = {
  fullName: '',
  specialization: 'badminton',
  yearsExperience: 1,
  mobile: '',
  aadhaar: '',
};

export default function TrainersStepPage() {
  const router = useRouter();
  const { application, ensureDraft, setApplication } = useOnboarding();
  const [trainers, setTrainers] = useState<TrainerInput[]>([{ ...EMPTY_TRAINER }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void ensureDraft().then((app) => {
      if (app.trainers?.length) setTrainers(app.trainers);
    });
  }, [ensureDraft]);

  function updateTrainer(index: number, patch: Partial<TrainerInput>) {
    setTrainers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  async function persist(next: TrainerInput[]) {
    const draft = application ?? (await ensureDraft());
    const cleaned = next.filter((t) => t.fullName.trim());
    const saved = await partnerApi.saveTrainers(draft.id, cleaned);
    setApplication(saved);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await persist(trainers);
      router.push('/register/legal');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save trainers');
    } finally {
      setBusy(false);
    }
  }

  async function handleSkip() {
    setBusy(true);
    setError('');
    try {
      await persist([]);
      router.push('/register/legal');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to skip trainers');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <RegisterHeader />
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-10 lg:grid-cols-[260px_1fr] sm:px-6">
        <RegisterStepper active="trainers" />
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-border bg-card p-6 sm:p-8"
        >
          <h1 className="font-display text-3xl font-bold">Trainer Onboarding</h1>
          <p className="mt-2 text-sm text-muted">Add coaches linked to your venue (optional).</p>
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="mt-8 space-y-6">
            {trainers.map((trainer, index) => (
              <div key={index} className="rounded-2xl border border-border bg-surface-low p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Full Name</label>
                    <input
                      className={fieldClass}
                      value={trainer.fullName}
                      onChange={(e) => updateTrainer(index, { fullName: e.target.value })}
                      placeholder="Coach name"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Specialization</label>
                    <select
                      className={fieldClass}
                      value={trainer.specialization}
                      onChange={(e) => updateTrainer(index, { specialization: e.target.value })}
                    >
                      {['cricket', 'football', 'badminton', 'swimming', 'tennis'].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Years of Experience</label>
                    <input
                      type="number"
                      min={0}
                      className={fieldClass}
                      value={trainer.yearsExperience ?? 0}
                      onChange={(e) =>
                        updateTrainer(index, { yearsExperience: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Mobile Number</label>
                    <input
                      className={fieldClass}
                      value={trainer.mobile ?? ''}
                      onChange={(e) =>
                        updateTrainer(index, {
                          mobile: e.target.value.replace(/\D/g, '').slice(0, 10),
                        })
                      }
                      placeholder="9876501234"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Aadhaar Number</label>
                    <input
                      className={fieldClass}
                      value={trainer.aadhaar ?? ''}
                      onChange={(e) =>
                        updateTrainer(index, {
                          aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12),
                        })
                      }
                      placeholder="XXXX XXXX XXXX"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="mt-4 text-sm font-semibold text-primary"
            onClick={() => setTrainers((prev) => [...prev, { ...EMPTY_TRAINER }])}
          >
            + Add Another Trainer
          </button>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
            <Link href="/register/sports" className="text-sm font-medium text-muted">
              ← Back
            </Link>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSkip()}
                className={secondaryBtnClass}
              >
                Skip for Now
              </button>
              <button type="submit" disabled={busy} className={primaryBtnClass}>
                Save & Continue
              </button>
            </div>
          </div>
        </form>
      </div>
      <PartnerFooter />
    </div>
  );
}
