'use client';

import { Suspense } from 'react';
import PrinterProofsInner from './proofs-inner';

export default function PrinterProofsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <PrinterProofsInner />
    </Suspense>
  );
}
