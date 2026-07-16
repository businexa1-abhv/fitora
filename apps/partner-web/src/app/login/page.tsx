'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, partnerApi, saveLoginSession } from '@/lib/api';
import { PartnerFooter, RegisterHeader, primaryBtnClass } from '@/components/partner-ui';

export default function PartnerLoginPage() {
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
      const response = await partnerApi.login(email, password);
      const roles = response.user.roles ?? [];
      if (!roles.includes('COURT_OWNER') && !roles.includes('ADMIN')) {
        setError('Partner / court owner access only');
        return;
      }
      saveLoginSession({
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
        user: response.user,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <RegisterHeader showLogin={false} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="font-display text-3xl font-bold">Partner Login</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in with your venue owner account to track applications and manage your tenant.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Password</label>
            <input
              type="password"
              required
              className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm font-semibold text-primary">
              Forgot password?
            </Link>
          </div>
          <button type="submit" disabled={loading} className={`${primaryBtnClass} w-full`}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <Link
          href="/register/business"
          className="mt-6 block text-center text-sm font-semibold text-primary"
        >
          New partner? Start registration
        </Link>
      </main>
      <PartnerFooter />
    </div>
  );
}
