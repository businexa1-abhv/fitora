'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Store } from 'lucide-react';
import { ApiError, saveAuthSession, shopPartnerApi } from '@/lib/api';
import { primaryBtnClass } from '@/components/shop-shell';

export default function ShopPartnerLoginPage() {
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
      const response = await shopPartnerApi.login(email, password);
      const roles = response.user.roles ?? [];
      if (!roles.includes('COURT_OWNER') && !roles.includes('ADMIN')) {
        setError('Court owner or admin access only');
        return;
      }

      let tenantName: string | undefined;
      let tenantId: string | undefined;
      try {
        const tenant = await shopPartnerApi.getTenantMe(response.tokens.accessToken);
        tenantName = tenant.brandName ?? tenant.name;
        tenantId = tenant.id;
      } catch {
        // Admin users may not have a tenant
      }

      saveAuthSession({
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
        user: response.user,
        tenantId,
        tenantName,
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
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">FitOra Shop Partner</h1>
            <p className="text-sm text-muted">Manage products, inventory & orders</p>
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
