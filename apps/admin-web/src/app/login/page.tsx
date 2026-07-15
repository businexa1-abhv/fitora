'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import { ApiError, adminApi, saveAuthSession } from '@/lib/api';
import { primaryBtnClass } from '@/components/admin-shell';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@fitora.com');
  const [password, setPassword] = useState('AdminPass123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await adminApi.login(email, password);
      if (!response.user.roles.includes('ADMIN')) {
        setError('Admin access only');
        return;
      }
      saveAuthSession({
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
        user: response.user,
      });
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#ffeae0,#fff5f1_55%)] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container text-white">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">FitOra Admin</h1>
            <p className="text-sm text-muted">Enterprise platform console</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <label className="mb-1.5 block text-sm font-medium">Email</label>
        <input
          type="email"
          required
          className="mb-4 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary-container"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="mb-1.5 block text-sm font-medium">Password</label>
        <input
          type="password"
          required
          className="mb-6 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary-container"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" disabled={loading} className={`${primaryBtnClass} w-full`}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
