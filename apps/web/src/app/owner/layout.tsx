'use client';

import { OwnerAuthGuard } from '@/components/owner/owner-auth-guard';
import { OwnerShell } from '@/components/owner/owner-shell';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <OwnerAuthGuard>
      <OwnerShell>{children}</OwnerShell>
    </OwnerAuthGuard>
  );
}
