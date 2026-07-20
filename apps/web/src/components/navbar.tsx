'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_NAME } from '@fitora/shared';
import { NotificationBell } from '@/components/notification-bell';

const NAV_LINKS = [
  { href: '/courts', label: 'Book' },
  { href: '/training', label: 'Train' },
  { href: '/shop', label: 'Shop' },
  { href: '/print', label: 'Print' },
  { href: '/services', label: 'Services' },
  { href: '/memberships', label: 'Memberships' },
];

export function Navbar({ transparent = false }: { transparent?: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHome = pathname === '/';

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        transparent && isHome ? 'bg-transparent' : 'glass border-b border-border/60 shadow-sm'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
            F
          </span>
          <span
            className={`text-xl font-bold tracking-tight ${
              transparent && isHome ? 'text-white' : 'text-foreground'
            }`}
          >
            {APP_NAME}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(link.href)
                  ? transparent && isHome
                    ? 'bg-white/20 text-white'
                    : 'bg-primary-light text-primary'
                  : transparent && isHome
                    ? 'text-white/90 hover:bg-white/10'
                    : 'text-muted hover:text-foreground hover:bg-background'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <NotificationBell light={transparent && isHome} />
          <Link
            href="/profile"
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              transparent && isHome
                ? 'text-white hover:bg-white/10'
                : 'text-muted hover:text-foreground'
            }`}
            title="My profile"
          >
            Profile
          </Link>
          <Link
            href="/login"
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              transparent && isHome
                ? 'text-white hover:bg-white/10'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Sign in
          </Link>
          <Link href="/register" className="btn-primary !py-2.5 !px-5 text-sm">
            Get started
          </Link>
        </div>

        <button
          type="button"
          className={`md:hidden p-2 rounded-lg ${
            transparent && isHome ? 'text-white' : 'text-foreground'
          }`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-card overflow-hidden"
          >
            <nav className="flex flex-col p-4 gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-medium hover:bg-primary-light hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-2 border-border" />
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-sm font-medium"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="btn-primary mt-2"
              >
                Get started
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
