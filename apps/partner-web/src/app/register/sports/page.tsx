'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, partnerApi, type SportConfigItem } from '@/lib/api';
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

export default function SportsStepPage() {
  const router = useRouter();
  const { application, ensureDraft, setApplication } = useOnboarding();
  const [items, setItems] = useState<SportConfigItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const sportSlugs = useMemo(() => {
    const venueSports = (application?.venue as { sports?: string[] } | null)?.sports;
    return venueSports?.length ? venueSports : ['badminton'];
  }, [application]);

  useEffect(() => {
    void ensureDraft().then((app) => {
      const existing = app.sportsConfig?.items;
      if (existing?.length) {
        setItems(existing);
        return;
      }
      const venueSports = (app.venue as { sports?: string[] } | null)?.sports ?? ['badminton'];
      setItems(
        venueSports.map((sportSlug) => ({
          sportSlug,
          courtCount: sportSlug === 'badminton' ? 4 : 2,
          maxPlayers: 4,
          standardRate: sportSlug === 'badminton' ? 500 : 700,
          memberRate: sportSlug === 'badminton' ? 400 : 550,
          slotIntervals: [60, 90, 120],
        })),
      );
    });
  }, [ensureDraft]);

  function updateItem(slug: string, patch: Partial<SportConfigItem>) {
    setItems((prev) =>
      prev.map((item) => (item.sportSlug === slug ? { ...item, ...patch } : item)),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const draft = application ?? (await ensureDraft());
      const saved = await partnerApi.saveSports(draft.id, { items });
      setApplication(saved);
      router.push('/register/trainers');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save sports config');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <RegisterHeader />
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-10 lg:grid-cols-[260px_1fr] sm:px-6">
        <RegisterStepper active="sports" />
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <h1 className="font-display text-3xl font-bold">Sports & Membership Configuration</h1>
            <p className="mt-2 text-sm text-muted">
              Setting up your sports rates correctly ensures maximum booking efficiency.
            </p>
            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}
          </div>

          {items
            .filter((item) => sportSlugs.includes(item.sportSlug) || sportSlugs.length === 0)
            .map((item) => (
              <article
                key={item.sportSlug}
                className="rounded-3xl border border-border bg-card p-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold capitalize">
                    {item.sportSlug}
                  </h2>
                  {item.sportSlug === 'badminton' && (
                    <span className="rounded-full bg-surface-high px-3 py-1 text-xs font-semibold text-primary">
                      Most Popular
                    </span>
                  )}
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Number of Courts / Nets</label>
                    <input
                      type="number"
                      min={1}
                      className={fieldClass}
                      value={item.courtCount}
                      onChange={(e) =>
                        updateItem(item.sportSlug, { courtCount: Number(e.target.value) || 1 })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Max Players</label>
                    <input
                      type="number"
                      min={1}
                      className={fieldClass}
                      value={item.maxPlayers ?? 4}
                      onChange={(e) =>
                        updateItem(item.sportSlug, { maxPlayers: Number(e.target.value) || 1 })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Standard Rate (₹)</label>
                    <input
                      type="number"
                      min={0}
                      className={fieldClass}
                      value={item.standardRate}
                      onChange={(e) =>
                        updateItem(item.sportSlug, { standardRate: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Member Rate (₹)</label>
                    <input
                      type="number"
                      min={0}
                      className={fieldClass}
                      value={item.memberRate ?? 0}
                      onChange={(e) =>
                        updateItem(item.sportSlug, { memberRate: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(item.slotIntervals ?? [60, 90, 120]).map((mins) => (
                    <span
                      key={mins}
                      className="rounded-full bg-surface-low px-3 py-1 text-xs font-semibold text-primary"
                    >
                      {mins}m
                    </span>
                  ))}
                </div>
              </article>
            ))}

          <div className="flex items-center justify-between gap-4">
            <Link href="/register/venue" className="text-sm font-medium text-muted">
              ← Back to Venue Details
            </Link>
            <div className="flex gap-3">
              <button
                type="button"
                className={secondaryBtnClass}
                onClick={() => router.push('/register/trainers')}
              >
                Save Draft
              </button>
              <button type="submit" disabled={busy} className={primaryBtnClass}>
                Continue to Trainers
              </button>
            </div>
          </div>
        </form>
      </div>
      <PartnerFooter />
    </div>
  );
}
