'use client';

import React from 'react';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/navbar';
import { PageShell } from '@/components/app-header';
import { buttonClassName, FormField, inputClassName } from '@/components/auth-layout';
import { ApiError } from '@/lib/api';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { enrollKidNew } from '@/lib/training';
import { completePayment } from '@/lib/payments';

export default function EnrollForm(): React.JSX.Element {
  const { batchId } = useParams<{ batchId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const programName = searchParams.get('program') ?? 'Training program';

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    school: '',
    medicalNotes: '',
    emergencyContact: '',
    emergencyPhone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    const user = getStoredUser();
    if (!token || !user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { payment } = await enrollKidNew(token, { batchId, ...form });
      await completePayment(
        token,
        payment,
        user.email,
        `${user.firstName} ${user.lastName}`,
        `Training — ${programName}`,
      );
      router.push('/training/my-kids');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <Navbar />

      <section className="hero-mesh text-white py-10 sm:py-12">
        <div className="mx-auto max-w-lg px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-white/70 text-sm font-semibold uppercase tracking-wider mb-1">Enrollment</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold">Enroll your child</h1>
            <p className="text-white/75 mt-2 text-sm">{programName}</p>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-lg px-4 sm:px-6 py-8 -mt-4">
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-5"
        >
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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

          <FormField label="Date of birth" id="dob">
            <input
              id="dob"
              type="date"
              required
              className={inputClassName}
              value={form.dateOfBirth}
              onChange={(e) => update('dateOfBirth', e.target.value)}
            />
          </FormField>

          <FormField label="Gender" id="gender">
            <select
              id="gender"
              className={inputClassName}
              value={form.gender}
              onChange={(e) => update('gender', e.target.value)}
            >
              <option value="">Prefer not to say</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </FormField>

          <FormField label="School (optional)" id="school">
            <input
              id="school"
              className={inputClassName}
              value={form.school}
              onChange={(e) => update('school', e.target.value)}
            />
          </FormField>

          <FormField label="Medical details (allergies, conditions)" id="medical">
            <textarea
              id="medical"
              rows={3}
              placeholder="Any allergies, asthma, injuries, or medications we should know about"
              className={inputClassName}
              value={form.medicalNotes}
              onChange={(e) => update('medicalNotes', e.target.value)}
            />
          </FormField>

          <FormField label="Emergency contact name" id="ec">
            <input
              id="ec"
              required
              className={inputClassName}
              value={form.emergencyContact}
              onChange={(e) => update('emergencyContact', e.target.value)}
            />
          </FormField>

          <FormField label="Emergency phone" id="ep">
            <input
              id="ep"
              required
              type="tel"
              className={inputClassName}
              value={form.emergencyPhone}
              onChange={(e) => update('emergencyPhone', e.target.value)}
            />
          </FormField>

          <button type="submit" disabled={loading} className={`${buttonClassName} w-full py-3`}>
            {loading ? 'Processing payment…' : 'Enroll & pay'}
          </button>
        </motion.form>
      </main>
    </PageShell>
  );
}
