'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/admin/auth-guard';
import { AdminShell } from '@/components/admin/admin-shell';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <AuthGuard>
      <AdminShell>{children}</AdminShell>
    </AuthGuard>
  );
}
