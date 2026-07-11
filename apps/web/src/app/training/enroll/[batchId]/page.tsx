import { Suspense } from 'react';
import EnrollForm from './enroll-form';

export default function EnrollPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-muted text-sm">Loading…</p></div>}>
      <EnrollForm />
    </Suspense>
  );
}
