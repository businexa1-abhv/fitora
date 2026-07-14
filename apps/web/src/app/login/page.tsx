'use client';

import React from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { UserRole } from '@fitora/shared';
import { AuthLayout, FormField, inputClassName, buttonClassName } from '@/components/auth-layout';
import { login } from '@/lib/api';
import { ApiError } from '@/lib/api';
import { getAdminAppUrl, saveAuthSession } from '@/lib/auth';

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(email, password);
      saveAuthSession(response);

      if (response.user.roles.includes(UserRole.ADMIN)) {
        window.location.href = getAdminAppUrl();
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to book courts, manage training, and more"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create one
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

        <FormField label="Email" id="email">
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className={inputClassName}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>

        <FormField label="Password" id="password">
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            minLength={8}
            className={inputClassName}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

        <button type="submit" disabled={loading} className={buttonClassName}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
