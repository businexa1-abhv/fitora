import Link from 'next/link';
import { PartnerFooter, RegisterHeader, primaryBtnClass } from '@/components/partner-ui';

export default function PartnerLoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <RegisterHeader showLogin={false} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="font-display text-3xl font-bold">Partner Login</h1>
        <p className="mt-2 text-sm text-muted">
          Existing owners can use the main FitOra web portal. New partners should complete
          onboarding here first.
        </p>
        <div className="mt-8 space-y-3">
          <a
            href={process.env.NEXT_PUBLIC_OWNER_WEB_URL ?? 'http://localhost:3000/login'}
            className={`${primaryBtnClass} w-full`}
          >
            Continue to Owner Portal
          </a>
          <Link
            href="/register/business"
            className="block text-center text-sm font-semibold text-primary"
          >
            New partner? Start registration
          </Link>
        </div>
      </main>
      <PartnerFooter />
    </div>
  );
}
