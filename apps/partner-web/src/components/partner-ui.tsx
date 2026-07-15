'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, CheckCircle2, Clock3, MapPin, Scale, Eye } from 'lucide-react';

const STEPS = [
  { key: 'business', href: '/register/business', label: 'Business Info', icon: Building2 },
  { key: 'venue', href: '/register/venue', label: 'Venue Details', icon: MapPin },
  { key: 'sports', href: '/register/sports', label: 'Sports Config', icon: Clock3 },
  { key: 'trainers', href: '/register/trainers', label: 'Trainers', icon: Building2 },
  { key: 'legal', href: '/register/legal', label: 'Legal & Banking', icon: Scale },
  { key: 'review', href: '/register/review', label: 'Review', icon: Eye },
] as const;

export function RegisterHeader({ showLogin = true }: { showLogin?: boolean }) {
  return (
    <header className="border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-bold text-primary">
          FitOra <span className="font-medium">Partner</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/#faq" className="hidden text-muted hover:text-foreground sm:inline">
            Support
          </Link>
          {showLogin && (
            <Link
              href="/login"
              className="rounded-full bg-primary-container px-4 py-2 font-semibold text-white"
            >
              Partner Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function RegisterStepper({ active }: { active: (typeof STEPS)[number]['key'] }) {
  const pathname = usePathname();
  const activeIndex = STEPS.findIndex((s) => s.key === active || pathname.startsWith(s.href));

  return (
    <aside className="rounded-2xl bg-surface-low p-5">
      <p className="font-display text-lg font-semibold text-foreground">Partner Registration</p>
      <p className="mt-1 text-sm text-muted">
        Step {Math.min(activeIndex + 1, STEPS.length)} of {STEPS.length}
      </p>
      <nav className="mt-6 space-y-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const done = index < activeIndex;
          const current = index === activeIndex;
          return (
            <Link
              key={step.key}
              href={step.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                current
                  ? 'bg-primary-container text-white shadow-sm'
                  : done
                    ? 'bg-white text-secondary'
                    : 'text-muted hover:bg-white/70'
              }`}
            >
              {done && !current ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              {step.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 rounded-xl bg-white p-4 text-sm text-muted">
        Need help with registration? Our onboarding team is available 24/7.
        <a href="mailto:partners@fitora.com" className="mt-2 block font-semibold text-primary">
          Contact Support →
        </a>
      </div>
    </aside>
  );
}

export function PartnerFooter() {
  return (
    <footer className="mt-auto border-t border-border/50 bg-surface-low">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-display text-lg font-bold text-primary">FitOra Partner</p>
          <p className="mt-3 max-w-sm text-sm text-muted">
            Empowering sports venue owners with smart management tools for the next generation of
            athletic excellence.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-foreground">Company</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>About</li>
            <li>Support</li>
            <li>Legal</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-foreground">Resources</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>Privacy Policy</li>
            <li>Terms of Service</li>
          </ul>
        </div>
      </div>
      <p className="border-t border-border/40 px-4 py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} FitOra Partner. All rights reserved.
      </p>
    </footer>
  );
}

export const fieldClass =
  'w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary-container focus:ring-2 focus:ring-primary-container/20';

export const labelClass = 'mb-1.5 block text-sm font-medium text-foreground';

export const primaryBtnClass =
  'inline-flex items-center justify-center gap-2 rounded-full bg-primary-container px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary disabled:opacity-60';

export const secondaryBtnClass =
  'inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-low';
