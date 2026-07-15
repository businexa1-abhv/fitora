import Link from 'next/link';
import { ArrowRight, CalendarCheck2, ChartNoAxesCombined, Eye } from 'lucide-react';
import {
  PartnerFooter,
  RegisterHeader,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/components/partner-ui';

export default function PartnerLandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <RegisterHeader />
      <main>
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,#3c2d26,#1d1b1a_55%)] text-white">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,0.2),transparent_45%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-28">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary-container">
                Global Partner Network
              </p>
              <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                Grow Your Sports Business with{' '}
                <span className="text-primary-container">FitOra</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-white/75 sm:text-lg">
                Revolutionize venue management, boost bookings, and streamline operations with our
                all-in-one platform built for sports facilities.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register/business" className={primaryBtnClass}>
                  Register a Venue <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#pricing"
                  className={`${secondaryBtnClass} border-white/30 bg-transparent text-white`}
                >
                  View Pricing
                </a>
              </div>
              <p className="mt-6 text-sm text-white/60">Joined by 2,400+ venue owners worldwide</p>
            </div>
            <div className="hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur lg:block">
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary-container/40 to-white/10"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="benefits" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Engineered for Operational Excellence
            </h2>
            <p className="mt-3 text-muted">
              Stop managing spreadsheets and start managing growth with tools built specifically for
              sports facilities.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Eye,
                title: 'Increased Visibility',
                body: 'Put your venue in front of thousands of active athletes searching for courts daily.',
                accent: 'Up to 45% more bookings',
              },
              {
                icon: CalendarCheck2,
                title: 'Automated Booking',
                body: 'Real-time availability sync and instant payments — no double bookings.',
                accent: '24/7 Availability',
                highlight: true,
              },
              {
                icon: ChartNoAxesCombined,
                title: 'Revenue Insights',
                body: 'Detailed analytics on peak hours, retention, and financial performance.',
                accent: 'Verified Growth',
              },
            ].map((item) => (
              <article
                key={item.title}
                className={`rounded-3xl p-6 ${
                  item.highlight
                    ? 'bg-primary-container text-white'
                    : 'border border-border bg-card'
                }`}
              >
                <item.icon
                  className={`h-8 w-8 ${item.highlight ? 'text-white' : 'text-secondary'}`}
                />
                <h3 className="mt-4 font-display text-xl font-semibold">{item.title}</h3>
                <p className={`mt-2 text-sm ${item.highlight ? 'text-white/85' : 'text-muted'}`}>
                  {item.body}
                </p>
                <p
                  className={`mt-4 text-sm font-semibold ${item.highlight ? 'text-white' : 'text-secondary'}`}
                >
                  {item.accent}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-surface-low py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Simple Onboarding. Powerful Results.
              </h2>
              <ol className="mt-8 space-y-6">
                {[
                  ['Register Your Venue', 'Tell us about your facility, location, and sports.'],
                  ['Configure Offerings', 'Set pricing, courts, trainers, and legal docs.'],
                  ['Start Hosting', 'Go live on FitOra after a quick verification review.'],
                ].map(([title, body], index) => (
                  <li key={title} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{title}</p>
                      <p className="text-sm text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="aspect-[4/3] rounded-[2rem] bg-gradient-to-br from-surface-high to-primary-container/30" />
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Transparent Pricing for Every Scale
            </h2>
            <p className="mt-3 text-muted">No upfront costs. We only win when you grow.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article className="rounded-3xl border border-border bg-card p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted">
                Growth Tier
              </p>
              <p className="mt-4 font-display text-5xl font-bold text-primary">
                8%<span className="text-lg font-medium text-muted"> / booking</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm text-muted">
                <li>✓ Unlimited bookings</li>
                <li>✓ Standard listing placement</li>
                <li>✓ Basic revenue reporting</li>
                <li>✓ 24/7 automated scheduling</li>
              </ul>
              <Link href="/register/business" className={`${primaryBtnClass} mt-8`}>
                Get Started
              </Link>
            </article>
            <article className="rounded-3xl bg-foreground p-8 text-white">
              <p className="inline-flex rounded-full bg-primary-container px-3 py-1 text-xs font-bold uppercase">
                Popular
              </p>
              <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-white/70">
                Enterprise Tier
              </p>
              <p className="mt-4 font-display text-5xl font-bold text-primary-container">Custom</p>
              <ul className="mt-6 space-y-3 text-sm text-white/75">
                <li>✓ Multi-venue operations</li>
                <li>✓ Priority placement</li>
                <li>✓ Dedicated success manager</li>
                <li>✓ Custom integrations</li>
              </ul>
              <a href="mailto:partners@fitora.com" className={`${primaryBtnClass} mt-8`}>
                Contact Sales
              </a>
            </article>
          </div>
        </section>

        <section id="faq" className="bg-surface-low py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="font-display text-3xl font-bold">Frequently Asked Questions</h2>
            <div className="mt-8 space-y-4">
              {[
                [
                  'How does the FitOra Partner program work?',
                  'Complete onboarding, pass a short verification review, then go live on the FitOra player app with automated bookings and payouts.',
                ],
                [
                  'Are there any upfront fees or monthly charges?',
                  'No setup fees on the Growth plan. FitOra takes a commission only when bookings convert.',
                ],
                [
                  'What type of support will I receive?',
                  'Partner success support is available 24/7 during onboarding and after go-live.',
                ],
              ].map(([q, a]) => (
                <details
                  key={q}
                  className="rounded-2xl border border-border bg-card p-5"
                  open={q.startsWith('How')}
                >
                  <summary className="cursor-pointer font-semibold text-foreground">{q}</summary>
                  <p className="mt-3 text-sm text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-[2rem] bg-gradient-to-r from-[#783200] to-primary-container px-8 py-14 text-center text-white">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ready to Modernize Your Venue?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">
              Join the future of sports venue management and start filling your courts.
            </p>
            <Link href="/register/business" className={`${secondaryBtnClass} mt-8 border-0`}>
              Start Your Registration
            </Link>
            <p className="mt-4 text-sm text-white/70">No credit card required to get started.</p>
          </div>
        </section>
      </main>
      <PartnerFooter />
    </div>
  );
}
