'use client';

import React from 'react';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getAccessToken, getStoredUser } from '@/lib/auth';
import { isTrainer } from '@/lib/trainer-utils';

export function TrainerAuthGuard({ children }: { children: React.ReactNode }): React.JSX.Element {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();

    if (!token || !user) {
      router.replace('/login');
      return;
    }

    if (!isTrainer(user)) {
      router.replace('/dashboard');
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
