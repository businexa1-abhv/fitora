'use client';

import { useEffect, useState, type FormEvent } from 'react';
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

const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata'];
const STATES = ['Karnataka', 'Maharashtra', 'Telangana', 'Tamil Nadu', 'Delhi', 'West Bengal'];

export default function BusinessStepPage() {
  const router = useRouter();
  const { application, ensureDraft, setApplication, loading } = useOnboarding();
  const [form, setForm] = useState({
    ownerName: '',
    businessName: '',
    phone: '',
    email: '',
    city: 'Bengaluru',
    venueAddress: '',
    state: 'Karnataka',
    pincode: '',
  });
  const [otp, setOtp] = useState('');
  const [otpHint, setOtpHint] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void ensureDraft().then((app) => {
      setForm({
        ownerName: app.ownerName ?? '',
        businessName: app.businessName ?? '',
        phone: app.phone?.replace(/^\+91/, '') ?? '',
        email: app.email ?? '',
        city: app.city ?? 'Bengaluru',
        venueAddress: app.venueAddress ?? '',
        state: app.state ?? 'Karnataka',
        pincode: app.pincode ?? '',
      });
    });
  }, [ensureDraft]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSendOtp() {
    setError('');
    setBusy(true);
    try {
      const draft = application ?? (await ensureDraft());
      const saved = await partnerApi.saveBusiness(draft.id, {
        ...form,
        phone: form.phone,
      });
      setApplication(saved);
      const result = await partnerApi.sendOtp(saved.id);
      if (result.debugOtp) {
        setOtp(result.debugOtp);
        setOtpHint(`Dev OTP: ${result.debugOtp} (also printed in the API terminal)`);
      } else {
        setOtpHint('OTP sent to your mobile.');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const draft = application ?? (await ensureDraft());
      const saved = await partnerApi.saveBusiness(draft.id, form);
      setApplication(saved);
      if (!saved.phoneVerified) {
        if (!otp) throw new ApiError('Enter the OTP to verify your mobile number', 400);
        const verified = await partnerApi.verifyOtp(saved.id, otp);
        setApplication(verified);
      }
      router.push('/register/venue');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save business profile');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="p-10 text-center text-muted">Loading…</p>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <RegisterHeader />
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-10 lg:grid-cols-[260px_1fr] sm:px-6">
        <RegisterStepper active="business" />
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-border bg-card p-6 sm:p-8"
        >
          <h1 className="font-display text-3xl font-bold text-foreground">Business Profile</h1>
          <p className="mt-2 text-sm text-muted">
            Tell us about your sports facility and ownership details to get started.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="ownerName">
                Owner Name
              </label>
              <input
                id="ownerName"
                required
                className={fieldClass}
                placeholder="Enter full name"
                value={form.ownerName}
                onChange={(e) => update('ownerName', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="businessName">
                Business Name
              </label>
              <input
                id="businessName"
                required
                className={fieldClass}
                placeholder="e.g. Smash Arena Bangalore"
                value={form.businessName}
                onChange={(e) => update('businessName', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="phone">
                Mobile Number
              </label>
              <div className="flex overflow-hidden rounded-xl border border-border bg-white">
                <span className="border-r border-border px-3 py-3 text-sm text-muted">+91</span>
                <input
                  id="phone"
                  required
                  className="w-full px-3 py-3 text-sm outline-none"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
                <button
                  type="button"
                  onClick={() => void handleSendOtp()}
                  className="px-4 text-sm font-semibold text-primary-container"
                  disabled={busy || form.phone.length < 10}
                >
                  Get OTP
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">
                We&apos;ll send a 6-digit code for verification. {otpHint}
              </p>
              <input
                className={`${fieldClass} mt-3`}
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              {application?.phoneVerified && (
                <p className="mt-1 text-xs font-medium text-secondary">Mobile verified</p>
              )}
            </div>
            <div>
              <label className={labelClass} htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className={fieldClass}
                placeholder="owner@business.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-8">
            <p className={labelClass}>Select Your City</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => update('city', city)}
                  className={`rounded-2xl border px-3 py-4 text-sm font-medium ${
                    form.city === city
                      ? 'border-primary-container bg-surface-low text-primary'
                      : 'border-border bg-white text-muted'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label className={labelClass} htmlFor="venueAddress">
              Venue Address
            </label>
            <textarea
              id="venueAddress"
              required
              rows={3}
              className={fieldClass}
              placeholder="Shop/Plot Number, Street Name, Landmark"
              value={form.venueAddress}
              onChange={(e) => update('venueAddress', e.target.value)}
            />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="state">
                State
              </label>
              <select
                id="state"
                className={fieldClass}
                value={form.state}
                onChange={(e) => update('state', e.target.value)}
              >
                {STATES.map((state) => (
                  <option key={state}>{state}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="pincode">
                PIN Code
              </label>
              <input
                id="pincode"
                required
                className={fieldClass}
                placeholder="560001"
                value={form.pincode}
                onChange={(e) => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between gap-4">
            <span className="text-sm text-muted">Save Draft</span>
            <button type="submit" disabled={busy} className={primaryBtnClass}>
              Continue to Step 2
            </button>
          </div>
        </form>
      </div>
      <PartnerFooter />
    </div>
  );
}
