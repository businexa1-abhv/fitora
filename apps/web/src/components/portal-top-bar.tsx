'use client';

import Link from 'next/link';
import { ExternalLink, Menu } from 'lucide-react';
import type { AuthUser } from '@fitora/shared';
import { UserAvatar } from '@/components/user-avatar';

type PortalTopBarProps = {
  title: string;
  subtitle?: string;
  browseHref?: string;
  browseLabel?: string;
  user?: AuthUser | null;
  onOpenMenu?: () => void;
};

export function PortalTopBar({
  title,
  subtitle,
  browseHref = '/',
  browseLabel = 'Browse Fitora',
  user,
  onOpenMenu,
}: PortalTopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground hover:border-primary hover:text-primary transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate leading-tight">{title}</p>
          {subtitle && (
            <p className="text-[11px] text-muted truncate leading-tight mt-0.5 hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={browseHref}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm font-semibold text-foreground hover:border-primary hover:bg-primary-light hover:text-primary transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span>{browseLabel}</span>
          </Link>

          {user && (
            <Link
              href="/account"
              className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-background pl-1 pr-3 py-1 hover:border-primary transition-colors"
              title="Account"
            >
              <UserAvatar user={user} size="sm" />
              <span className="text-xs font-semibold max-w-[6rem] truncate">{user.firstName}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
