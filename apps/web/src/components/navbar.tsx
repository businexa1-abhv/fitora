'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_NAME, type AuthUser } from '@fitora/shared';
import { NotificationBell } from '@/components/notification-bell';
import { UserMenu } from '@/components/user-menu';
import { UserAvatar } from '@/components/user-avatar';
import { clearAuthSession, getAccessToken, getStoredUser } from '@/lib/auth';

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
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const isHome = pathname === '/';
  const overlay = transparent && isHome && !scrolled;
  const isLoggedIn = !!user;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (getAccessToken()) {
      setUser(getStoredUser());
    } else {
      setUser(null);
    }
  }, [pathname]);

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-[background-color,box-shadow,border-color,backdrop-filter,padding] duration-300 ease-out ${
          overlay
            ? 'bg-transparent border-transparent shadow-none'
            : 'glass border-b border-border/60 shadow-sm'
        } ${scrolled ? 'py-0 shadow-md' : ''}`}
      >
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 transition-[padding] duration-300 ease-out ${
            scrolled ? 'py-2.5' : 'py-3.5'
          }`}
        >
          <Link href="/" className="flex items-center gap-2 group">
            <span
              className={`flex items-center justify-center rounded-xl bg-primary text-white font-bold shadow-md group-hover:scale-105 transition-all duration-300 ${
                scrolled ? 'h-8 w-8 text-base' : 'h-9 w-9 text-lg'
              }`}
            >
              F
            </span>
            <span
              className={`text-xl font-bold tracking-tight transition-colors duration-300 ${
                overlay ? 'text-white' : 'text-foreground'
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 ${
                  pathname.startsWith(link.href)
                    ? overlay
                      ? 'bg-white/20 text-white'
                      : 'bg-primary-light text-primary'
                    : overlay
                      ? 'text-white/90 hover:bg-white/10'
                      : 'text-muted hover:text-foreground hover:bg-background'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <NotificationBell light={overlay} />
                <UserMenu light={overlay} />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-300 ${
                    overlay ? 'text-white hover:bg-white/10' : 'text-muted hover:text-foreground'
                  }`}
                >
                  Sign in
                </Link>
                <Link href="/register" className="btn-primary !py-2.5 !px-5 text-sm">
                  Get started
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className={`md:hidden p-2 rounded-lg transition-colors duration-300 ${
              overlay ? 'text-white' : 'text-foreground'
            }`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {isLoggedIn && !mobileOpen ? (
              <UserAvatar user={user} size="sm" />
            ) : (
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
            )}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden border-t border-border bg-card/95 backdrop-blur-md overflow-hidden"
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
                {isLoggedIn ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-2">
                      <UserAvatar user={user} size="md" />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted truncate">{user.email}</p>
                      </div>
                    </div>
                    <Link
                      href="/account"
                      onClick={() => setMobileOpen(false)}
                      className="px-4 py-3 rounded-xl text-sm font-medium hover:bg-primary-light hover:text-primary"
                    >
                      Account details
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setMobileOpen(false)}
                      className="px-4 py-3 rounded-xl text-sm font-medium hover:bg-primary-light hover:text-primary"
                    >
                      Settings
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="px-4 py-3 rounded-xl text-sm font-medium hover:bg-primary-light hover:text-primary"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/notifications"
                      onClick={() => setMobileOpen(false)}
                      className="px-4 py-3 rounded-xl text-sm font-medium hover:bg-primary-light hover:text-primary"
                    >
                      Notifications
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        clearAuthSession();
                        setMobileOpen(false);
                        router.push('/login');
                      }}
                      className="px-4 py-3 rounded-xl text-sm font-medium text-red-600 text-left hover:bg-red-50"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Offset content under the fixed bar (home overlay sits on the hero instead) */}
      {!(transparent && isHome) && <div className="h-[var(--nav-height)] shrink-0" aria-hidden />}
    </>
  );
}
