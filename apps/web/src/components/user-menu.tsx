'use client';

import React from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
} from 'lucide-react';
import { ROLE_LABELS, UserRole, type AuthUser } from '@fitora/shared';
import { UserAvatar } from '@/components/user-avatar';
import { clearAuthSession, getAccessToken, getStoredUser, updateStoredUser } from '@/lib/auth';
import { getMe } from '@/lib/api';

export function UserMenu({ light = false }: { light?: boolean }): React.JSX.Element | null {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = getStoredUser();
    const token = getAccessToken();
    if (!stored || !token) {
      setUser(null);
      return;
    }
    setUser(stored);

    getMe(token)
      .then((fresh) => {
        const next: AuthUser = {
          id: fresh.id,
          email: fresh.email,
          firstName: fresh.firstName,
          lastName: fresh.lastName,
          roles: fresh.roles,
          phone: fresh.phone,
          avatarUrl: fresh.avatarUrl,
          emailVerified: fresh.emailVerified,
          phoneVerified: fresh.phoneVerified,
        };
        updateStoredUser(next);
        setUser(next);
      })
      .catch(() => {
        /* keep stored user */
      });
  }, []);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!user) return null;

  const primaryRole = user.roles[0] ?? UserRole.PLAYER;

  function logout() {
    clearAuthSession();
    setOpen(false);
    router.push('/login');
  }

  const links = [
    { href: '/account', label: 'Account details', icon: UserRound },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/bookings', label: 'My bookings', icon: CalendarDays },
    { href: '/payments', label: 'Payments', icon: CreditCard },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-2 rounded-full p-1 pr-2 transition-colors ${
          light ? 'hover:bg-white/15 text-white' : 'hover:bg-primary-light/70 text-foreground'
        }`}
      >
        <UserAvatar user={user} size="sm" />
        <span className="hidden lg:block max-w-[7rem] truncate text-sm font-semibold">
          {user.firstName}
        </span>
        <ChevronDown
          className={`h-4 w-4 opacity-70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            role="menu"
            className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl border border-border bg-card shadow-xl overflow-hidden z-50"
          >
            <div className="flex items-center gap-3 px-4 py-4 bg-primary-light/40 border-b border-border">
              <UserAvatar user={user} size="md" />
              <div className="min-w-0">
                <p className="font-bold truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted truncate">{user.email}</p>
                <p className="text-[11px] font-semibold text-primary mt-0.5">
                  {ROLE_LABELS[primaryRole]}
                </p>
              </div>
            </div>

            <nav className="p-2">
              {links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-primary-light hover:text-primary transition-colors"
                >
                  <item.icon className="h-4 w-4 shrink-0 opacity-70" />
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="border-t border-border p-2">
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
