'use client';

import React from 'react';

import Link from 'next/link';
import { type FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ChevronRight, KeyRound, LogOut, UserRound } from 'lucide-react';
import type { AuthUser } from '@fitora/shared';
import { Navbar } from '@/components/navbar';
import { PageShell } from '@/components/app-header';
import { FadeUp } from '@/components/motion';
import { clearAuthSession, getAccessToken, getStoredUser } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';

export default function SettingsPage(): React.JSX.Element {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getAccessToken();
    const stored = getStoredUser();
    if (!token || !stored) {
      router.replace('/login');
      return;
    }
    setUser(stored);
  }, [router]);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    setSaving(true);
    try {
      await apiFetch(
        '/auth/change-password',
        {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword }),
        },
        token,
      );
      setMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update password');
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    clearAuthSession();
    router.push('/login');
  }

  if (!user) {
    return (
      <PageShell>
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
          <div className="h-40 rounded-2xl skeleton" />
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        <FadeUp>
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">Settings</p>
          <h1 className="text-3xl font-extrabold mt-1">Account settings</h1>
          <p className="text-muted text-sm mt-2">Manage your profile, security, and preferences</p>
        </FadeUp>

        <FadeUp delay={0.06}>
          <div className="mt-8 space-y-2">
            <Link
              href="/account"
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 hover:border-primary hover:bg-primary-light/30 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <UserRound className="h-4 w-4 text-primary" />
                Profile & account details
              </span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
            <Link
              href="/notifications/settings"
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 hover:border-primary hover:bg-primary-light/30 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <Bell className="h-4 w-4 text-primary" />
                Notification preferences
              </span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          </div>
        </FadeUp>

        <FadeUp delay={0.12}>
          <form
            onSubmit={handleChangePassword}
            className="mt-6 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <h2 className="font-bold">Change password</h2>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-lg bg-primary-light border border-primary/20 px-3 py-2 text-sm text-primary">
                {message}
              </div>
            )}

            <label className="block">
              <span className="text-sm font-medium">Current password</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="input-playo mt-1.5"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">New password</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="input-playo mt-1.5"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Confirm new password</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="input-playo mt-1.5"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
              {saving ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </FadeUp>

        <FadeUp delay={0.18}>
          <button
            type="button"
            onClick={logout}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </FadeUp>
      </main>
    </PageShell>
  );
}
