'use client';

import { PrinterAuthGuard } from '@/components/printer/printer-auth-guard';
import { PrinterShell } from '@/components/printer/printer-shell';

export default function PrinterLayout({ children }: { children: React.ReactNode }) {
  return (
    <PrinterAuthGuard>
      <PrinterShell>{children}</PrinterShell>
    </PrinterAuthGuard>
  );
}
