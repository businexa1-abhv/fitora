'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, partnerApi } from '@/lib/api';
import { useOnboarding } from '@/components/onboarding-provider';
import {
  PartnerFooter,
  RegisterHeader,
  RegisterStepper,
  fieldClass,
  labelClass,
  primaryBtnClass,
} from '@/components/partner-ui';

export default function LegalStepPage() {
  const router = useRouter();
  const { application, ensureDraft, setApplication } = useOnboarding();
  const [form, setForm] = useState({
    gstNumber: '',
    panNumber: '',
    aadhaarNumber: '',
    bankAccountNumber: '',
    ifscCode: '',
    businessLicenseUrl: '',
    identityProofUrl: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void ensureDraft().then((app) => {
      const legal = (app.legal ?? {}) as typeof form;
      setForm({
        gstNumber: legal.gstNumber ?? '',
        panNumber: legal.panNumber ?? '',
        aadhaarNumber: legal.aadhaarNumber ?? '',
        bankAccountNumber: legal.bankAccountNumber ?? '',
        ifscCode: legal.ifscCode ?? '',
        businessLicenseUrl:
          legal.businessLicenseUrl || 'https://cdn.fitora.com/docs/license-placeholder.pdf',
        identityProofUrl:
          legal.identityProofUrl || 'https://cdn.fitora.com/docs/identity-placeholder.pdf',
      });
    });
  }, [ensureDraft]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const draft = application ?? (await ensureDraft());
      const saved = await partnerApi.saveLegal(draft.id, form);
      setApplication(saved);
      router.push('/register/review');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save legal details');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <RegisterHeader />
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-10 lg:grid-cols-[260px_1fr] sm:px-6">
        <RegisterStepper active="legal" />
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-border bg-card p-6 sm:p-8"
        >
          <h1 className="font-display text-3xl font-bold">Legal Verification & Banking</h1>
          <p className="mt-2 text-sm text-muted">
            Provide business identification and bank details for seamless revenue settlement.
          </p>
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>GST Number</label>
              <input
                className={fieldClass}
                value={form.gstNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, gstNumber: e.target.value.toUpperCase() }))
                }
                placeholder="22AAAAA0000A1Z5"
              />
              <p className="mt-1 text-xs text-muted">15-digit alphanumeric GSTIN</p>
            </div>
            <div>
              <label className={labelClass}>PAN Card Number</label>
              <input
                className={fieldClass}
                value={form.panNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, panNumber: e.target.value.toUpperCase() }))
                }
                placeholder="ABCDE1234F"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Aadhaar Number (Authorized Representative)</label>
              <input
                className={fieldClass}
                value={form.aadhaarNumber}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12),
                  }))
                }
                placeholder="XXXX XXXX XXXX"
              />
            </div>
            <div>
              <label className={labelClass}>Bank Account Number</label>
              <input
                className={fieldClass}
                value={form.bankAccountNumber}
                onChange={(e) => setForm((p) => ({ ...p, bankAccountNumber: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>IFSC Code</label>
              <input
                className={fieldClass}
                value={form.ifscCode}
                onChange={(e) => setForm((p) => ({ ...p, ifscCode: e.target.value.toUpperCase() }))}
                placeholder="HDFC0001234"
              />
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-dashed border-border bg-surface-low p-6 text-sm text-muted">
              Business License / Registration
              <p className="mt-2 text-xs">
                PDF, JPEG or PNG (Max 5MB) — placeholder attached for onboarding
              </p>
            </div>
            <div className="rounded-2xl border border-dashed border-border bg-surface-low p-6 text-sm text-muted">
              Identity Proof (Aadhaar/PAN)
              <p className="mt-2 text-xs">
                PDF, JPEG or PNG (Max 5MB) — placeholder attached for onboarding
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-secondary">
            Please ensure all documents are clear and match the business name on this application.
          </div>

          <div className="mt-10 flex items-center justify-between gap-4">
            <Link href="/register/trainers" className="text-sm font-medium text-muted">
              ← Back to Details
            </Link>
            <button type="submit" disabled={busy} className={primaryBtnClass}>
              Save & Continue
            </button>
          </div>
        </form>
      </div>
      <PartnerFooter />
    </div>
  );
}
