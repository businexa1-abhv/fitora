'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, partnerApi, saveAuthSession } from '@/lib/api';
import { useOnboarding } from '@/components/onboarding-provider';
import {
  PartnerFooter,
  RegisterHeader,
  RegisterStepper,
  primaryBtnClass,
} from '@/components/partner-ui';

export default function ReviewStepPage() {
  const router = useRouter();
  const { application, ensureDraft, setApplication } = useOnboarding();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void ensureDraft();
  }, [ensureDraft]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!acceptedTerms) {
      setError('Please accept the partner terms to continue');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const draft = application ?? (await ensureDraft());
      const visuals = await partnerApi.saveVisuals(draft.id, {
        logoUrl: 'https://cdn.fitora.com/partners/logo-placeholder.png',
        exteriorUrl: 'https://cdn.fitora.com/partners/exterior-placeholder.jpg',
        receptionUrl: 'https://cdn.fitora.com/partners/reception-placeholder.jpg',
        courtPhotoUrls: [
          'https://cdn.fitora.com/partners/court-1.jpg',
          'https://cdn.fitora.com/partners/court-2.jpg',
          'https://cdn.fitora.com/partners/court-3.jpg',
        ],
        acceptedTerms: true,
      });
      setApplication(visuals);
      const result = await partnerApi.submit(visuals.id);
      saveAuthSession(result);
      router.push('/register/submitted');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to submit application');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <RegisterHeader />
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-10 lg:grid-cols-[260px_1fr] sm:px-6">
        <RegisterStepper active="review" />
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <h1 className="font-display text-3xl font-bold">Final Review & Visuals</h1>
            <p className="mt-2 text-sm text-muted">
              Bring your venue to life with photos and review your application before submission.
            </p>
            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {['Business Logo', 'Business Exterior', 'Reception Area'].map((label) => (
                <div
                  key={label}
                  className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-surface-low text-sm text-muted"
                >
                  {label}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              Court / Playing Area Photos — placeholder gallery attached for successful onboarding.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold">Review Details</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Business Entity</dt>
                <dd className="font-semibold">{application?.businessName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">Primary Contact</dt>
                <dd className="font-semibold">
                  {application?.ownerName}
                  <br />
                  <span className="font-normal text-muted">{application?.email}</span>
                </dd>
              </div>
              <div>
                <dt className="text-muted">Venue Location</dt>
                <dd className="font-semibold">
                  {application?.venueAddress}
                  <br />
                  <span className="font-normal text-muted">
                    {application?.city}, {application?.state} {application?.pincode}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-muted">Amenities Selected</dt>
                <dd className="font-semibold">
                  {((application?.venue as { amenities?: string[] } | null)?.amenities ?? []).join(
                    ', ',
                  ) || '—'}
                </dd>
              </div>
            </dl>
            <Link
              href="/register/business"
              className="mt-6 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium"
            >
              Edit All Previous Steps
            </Link>
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-surface-high/60 p-4 text-sm">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 accent-primary-container"
            />
            <span>
              I hereby certify that the information provided is accurate and I am authorized to
              represent this business. I agree to the FitOra Partner Terms of Service and Privacy
              Policy.
            </span>
          </label>

          <div className="flex items-center justify-between gap-4">
            <Link href="/register/legal" className="text-sm font-medium text-muted">
              ← Back to Step 3
            </Link>
            <button type="submit" disabled={busy} className={primaryBtnClass}>
              Submit Application
            </button>
          </div>
        </form>
      </div>
      <PartnerFooter />
    </div>
  );
}
