'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/navbar';
import { PageShell } from '@/components/app-header';
import { FormField, inputClassName, buttonClassName } from '@/components/auth-layout';
import { ApiError, apiFetch } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';

const SPORTS = [
  'Badminton',
  'Tennis',
  'Cricket',
  'Football',
  'Basketball',
  'Squash',
  'Swimming',
  'Volleyball',
  'Table Tennis',
  'Other',
];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];

function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

export default function PlayerProfilePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const user = getStoredUser();

  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: (user as unknown as { phone?: string })?.phone ?? '',
    email: user?.email ?? '',
    // Extended fields stored in component state only (no API yet for these)
    sports: [] as string[],
    skillLevel: '',
    emergencyName: '',
    emergencyPhone: '',
    notifyBookings: true,
    notifyMembership: true,
    notifyTraining: true,
    notifyMarketing: false,
  });

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !user) {
      router.replace('/login');
    }
  }, [router, user]);

  function update(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleSport(sport: string) {
    setForm((prev) => ({
      ...prev,
      sports: prev.sports.includes(sport)
        ? prev.sports.filter((s) => s !== sport)
        : [...prev.sports, sport],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;

    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const updated = await apiFetch<typeof user>(
        '/users/me',
        {
          method: 'PUT',
          body: JSON.stringify({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            phone: form.phone.trim() || undefined,
          }),
        },
        token,
      );
      if (updated) {
        // Update stored user fields without touching tokens
        const raw = localStorage.getItem('fitora_user');
        if (raw) {
          try {
            const stored = JSON.parse(raw) as Record<string, unknown>;
            localStorage.setItem(
              'fitora_user',
              JSON.stringify({ ...stored, ...(updated as unknown as Record<string, unknown>) }),
            );
          } catch {
            /* ignore */
          }
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <PageShell>
      <Navbar />

      <section className="hero-mesh text-white py-10 sm:py-14">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-5"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-extrabold text-white backdrop-blur">
              {initials(user.firstName, user.lastName)}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold">
                {user.firstName} {user.lastName}
              </h1>
              <p className="mt-1 text-sm text-white/75">{user.email}</p>
            </div>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {saved && (
          <div className="rounded-xl border border-primary/20 bg-primary-light px-4 py-3 text-sm font-medium text-primary">
            ✓ Profile saved successfully
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Details */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5"
          >
            <h2 className="font-bold text-base">Personal details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="First name" id="firstName">
                <input
                  id="firstName"
                  required
                  className={inputClassName}
                  value={form.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                />
              </FormField>
              <FormField label="Last name" id="lastName">
                <input
                  id="lastName"
                  required
                  className={inputClassName}
                  value={form.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Email address" id="email">
              <input
                id="email"
                type="email"
                className={`${inputClassName} opacity-60`}
                value={form.email}
                disabled
                title="Email cannot be changed. Contact support."
              />
              <p className="mt-1 text-xs text-muted">Email address cannot be changed.</p>
            </FormField>
            <FormField label="Phone number" id="phone">
              <input
                id="phone"
                type="tel"
                className={inputClassName}
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+91 98765 43210"
              />
            </FormField>
          </motion.section>

          {/* Sports & Skill Level */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5"
          >
            <h2 className="font-bold text-base">Sports &amp; skill</h2>
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Favourite sports</p>
              <div className="flex flex-wrap gap-2">
                {SPORTS.map((sport) => (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => toggleSport(sport)}
                    className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${
                      form.sports.includes(sport)
                        ? 'border-primary bg-primary-light text-primary'
                        : 'border-border bg-background text-muted hover:border-primary hover:text-primary'
                    }`}
                  >
                    {sport}
                  </button>
                ))}
              </div>
            </div>
            <FormField label="Skill level" id="skill">
              <select
                id="skill"
                className={inputClassName}
                value={form.skillLevel}
                onChange={(e) => update('skillLevel', e.target.value)}
              >
                <option value="">Select skill level</option>
                {SKILL_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </FormField>
          </motion.section>

          {/* Emergency Contact */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5"
          >
            <h2 className="font-bold text-base">Emergency contact</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Contact name" id="emergencyName">
                <input
                  id="emergencyName"
                  className={inputClassName}
                  value={form.emergencyName}
                  onChange={(e) => update('emergencyName', e.target.value)}
                  placeholder="Jane Doe"
                />
              </FormField>
              <FormField label="Contact phone" id="emergencyPhone">
                <input
                  id="emergencyPhone"
                  type="tel"
                  className={inputClassName}
                  value={form.emergencyPhone}
                  onChange={(e) => update('emergencyPhone', e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </FormField>
            </div>
          </motion.section>

          {/* Notification Preferences */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4"
          >
            <h2 className="font-bold text-base">Notification preferences</h2>
            {[
              {
                key: 'notifyBookings',
                label: 'Booking confirmations & reminders',
                desc: 'Get notified about upcoming court sessions',
              },
              {
                key: 'notifyMembership',
                label: 'Membership updates',
                desc: 'Activation, expiry reminders, renewal',
              },
              {
                key: 'notifyTraining',
                label: 'Training & attendance',
                desc: 'Batch schedules, attendance updates for kids',
              },
              {
                key: 'notifyMarketing',
                label: 'Offers & promotions',
                desc: 'Discounts, new courts, and platform news',
              },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex cursor-pointer items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted">{desc}</p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded accent-primary"
                  checked={form[key as keyof typeof form] as boolean}
                  onChange={(e) => update(key, e.target.checked)}
                />
              </label>
            ))}
          </motion.section>

          <button type="submit" disabled={saving} className={`${buttonClassName} w-full py-3`}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </main>
    </PageShell>
  );
}
