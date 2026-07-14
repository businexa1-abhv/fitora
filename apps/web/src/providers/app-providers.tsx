'use client';

import React from 'react';

import { QueryProvider } from '@/providers/query-provider';

export function AppProviders({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <QueryProvider>{children}</QueryProvider>;
}
