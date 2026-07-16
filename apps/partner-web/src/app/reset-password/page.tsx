'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ApiError, partnerApi } from '@/lib/api';
import { PartnerFooter, RegisterHeader, primaryBtnClass } from '@/components/partner-ui';

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError('Reset token missing from link');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await partnerApi.resetPassword(token, password);
      router.push('/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <input
        type="password"
        required
        minLength={8}
        placeholder="New password"
        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" disabled={loading} className={`${primaryBtnClass} w-full`}>
        {loading ? 'Updating…' : 'Reset password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <RegisterHeader showLogin />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="font-display text-3xl font-bold">Reset password</h1>
        <p className="mt-2 text-sm text-muted">Choose a new password for your partner account.</p>
        <Suspense fallback={<p className="mt-8 text-sm text-muted">Loading…</p>}>
          <ResetForm />
        </Suspense>
        <Link href="/login" className="mt-6 block text-center text-sm font-semibold text-primary">
          Back to login
        </Link>
      </main>
      <PartnerFooter />
    </div>
  );
}
