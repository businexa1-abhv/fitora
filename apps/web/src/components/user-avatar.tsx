'use client';

import React from 'react';

import Image from 'next/image';
import type { AuthUser } from '@fitora/shared';
import { getUserInitials } from '@/lib/auth';

export function UserAvatar({
  user,
  size = 'md',
  className = '',
}: {
  user: AuthUser | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}): React.JSX.Element {
  const px = size === 'lg' ? 64 : size === 'sm' ? 32 : 36;
  const sizeClass =
    size === 'lg' ? 'h-16 w-16 text-xl' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm';

  if (user?.avatarUrl) {
    return (
      <Image
        src={user.avatarUrl}
        alt={`${user.firstName} ${user.lastName}`}
        width={px}
        height={px}
        unoptimized
        className={`${sizeClass} rounded-full object-cover ring-2 ring-white/40 shadow-sm ${className}`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span
      className={`inline-flex ${sizeClass} items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-sm ring-2 ring-white/40 ${className}`}
      aria-hidden
    >
      {getUserInitials(user)}
    </span>
  );
}
