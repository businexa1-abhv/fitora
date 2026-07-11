import Link from 'next/link';
import { APP_NAME } from '@fitora/shared';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 hero-mesh text-white flex-col justify-between p-12 relative overflow-hidden">
        <Link href="/" className="flex items-center gap-2 relative z-10">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 font-bold text-xl">F</span>
          <span className="text-2xl font-bold">{APP_NAME}</span>
        </Link>
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold leading-tight">
            Book sports venues.
            <br />
            Train. Play. Repeat.
          </h2>
          <p className="mt-4 text-white/70 text-lg max-w-md">
            Join India&apos;s growing sports community — book courts, enroll in training, and stay active.
          </p>
          <div className="mt-8 flex gap-4 text-4xl">
            <span className="animate-float">🏸</span>
            <span className="animate-float" style={{ animationDelay: '0.5s' }}>⚽</span>
            <span className="animate-float" style={{ animationDelay: '1s' }}>🏏</span>
            <span className="animate-float" style={{ animationDelay: '1.5s' }}>🎾</span>
          </div>
        </div>
        <p className="text-white/50 text-sm relative z-10">© {new Date().getFullYear()} {APP_NAME}</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col min-h-screen bg-background">
        <div className="lg:hidden p-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-bold">F</span>
            <span className="text-xl font-bold">{APP_NAME}</span>
          </Link>
        </div>

        <main className="flex flex-1 items-center justify-center px-4 sm:px-8 py-8">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold">{title}</h1>
              <p className="mt-2 text-muted">{subtitle}</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
              {children}
            </div>

            <p className="mt-6 text-center text-sm text-muted">{footer}</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export function FormField({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputClassName = 'input-playo';

export const buttonClassName = 'btn-primary w-full disabled:opacity-50';
