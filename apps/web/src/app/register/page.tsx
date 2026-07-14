'use client';

import React from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ROLE_LABELS, UserRole } from '@fitora/shared';
import { AuthLayout, FormField, inputClassName, buttonClassName } from '@/components/auth-layout';
import { register, ApiError } from '@/lib/api';
import { saveAuthSession } from '@/lib/auth';

const REGISTER_ROLES = [
  UserRole.PLAYER,
  UserRole.COURT_OWNER,
  UserRole.TRAINER,
  UserRole.SERVICE_PROVIDER,
  UserRole.PRINTER,
];

export default function RegisterPage(): React.JSX.Element {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: UserRole.PLAYER,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await register({
        ...form,
        phone: form.phone || undefined,
      });
      saveAuthSession(response);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Fitora as a player, court owner, trainer, or service provider"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField label="First name" id="firstName">
            <input
              id="firstName"
              required
              className={inputClassName}
              value={form.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
            />
          </FormField>
          <FormField label="Last name" id="lastName">
            <input
              id="lastName"
              required
              className={inputClassName}
              value={form.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Email" id="email">
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className={inputClassName}
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
          />
        </FormField>

        <FormField label="Phone (optional)" id="phone">
          <input
            id="phone"
            type="tel"
            className={inputClassName}
            placeholder="+919876543210"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
          />
        </FormField>

        <FormField label="I am a" id="role">
          <select
            id="role"
            required
            className={inputClassName}
            value={form.role}
            onChange={(e) => updateField('role', e.target.value)}
          >
            {REGISTER_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Password" id="password">
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClassName}
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
          />
        </FormField>

        <button type="submit" disabled={loading} className={buttonClassName}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
