'use client';

import { TrainerAuthGuard } from '@/components/trainer/trainer-auth-guard';
import { TrainerShell } from '@/components/trainer/trainer-shell';

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return (
    <TrainerAuthGuard>
      <TrainerShell>{children}</TrainerShell>
    </TrainerAuthGuard>
  );
}
