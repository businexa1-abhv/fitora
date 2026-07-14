'use client';

import React from 'react';

import { PrinterAuthGuard } from '@/components/printer/printer-auth-guard';
import { PrinterShell } from '@/components/printer/printer-shell';

export default function PrinterLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <PrinterAuthGuard>
      <PrinterShell>{children}</PrinterShell>
    </PrinterAuthGuard>
  );
}
