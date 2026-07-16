'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ApiError, partnerApi } from '@/lib/api';
import { PartnerFooter, RegisterHeader, primaryBtnClass } from '@/components/partner-ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await partnerApi.forgotPassword(email);
      setMessage(res.message || 'If an account exists, a reset link has been sent.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <RegisterHeader showLogin />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="font-display text-3xl font-bold">Forgot password</h1>
        <p className="mt-2 text-sm text-muted">
          Enter your partner email and we will send a reset link.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </div>
          )}
          <input
            type="email"
            required
            placeholder="Email"
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={loading} className={`${primaryBtnClass} w-full`}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <Link href="/login" className="mt-6 block text-center text-sm font-semibold text-primary">
          Back to login
        </Link>
      </main>
      <PartnerFooter />
    </div>
  );
}
