'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { APP_NAME, UserRole } from '@fitora/shared';
import { login, ApiError } from '@/lib/api';
import { saveAuthSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AdminLoginPage() {
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

      if (!response.user.roles.includes(UserRole.ADMIN)) {
        setError('Admin access only. Use the main app for other roles.');
        return;
      }

      saveAuthSession(response);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground flex-col justify-between p-12">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 font-bold text-lg backdrop-blur">
            F
          </span>
          <span className="text-xl font-bold">{APP_NAME}</span>
        </div>

        <div>
          <h1 className="text-4xl font-extrabold leading-tight">
            Platform
            <br />
            control center
          </h1>
          <p className="text-primary-foreground/75 mt-4 text-lg max-w-sm">
            Manage users, courts, bookings, payments, and platform operations.
          </p>
        </div>

        <p className="text-primary-foreground/50 text-sm">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
            <CardHeader className="lg:hidden text-center">
              <CardTitle className="text-primary">{APP_NAME}</CardTitle>
              <CardDescription>Admin Portal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="hidden lg:block mb-6">
                <CardTitle className="text-2xl">Admin sign in</CardTitle>
                <CardDescription className="mt-1">Platform administration access only</CardDescription>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@fitora.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Sign in to admin
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link href="http://localhost:3000" className="text-primary font-medium hover:underline">
                  ← Back to main app
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
