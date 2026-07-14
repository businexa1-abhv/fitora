'use client';

import React from 'react';

import { TrainerAuthGuard } from '@/components/trainer/trainer-auth-guard';
import { TrainerShell } from '@/components/trainer/trainer-shell';

export default function TrainerLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <TrainerAuthGuard>
      <TrainerShell>{children}</TrainerShell>
    </TrainerAuthGuard>
  );
}
