import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type FitoraRole = 'ADMIN' | 'OWNER' | 'COACH' | 'PLAYER' | 'SHOP_OWNER';

export interface AuthSession {
  accessToken: string;
  userId: string;
  roles: FitoraRole[];
  subscriptionActive?: boolean;
}

interface AuthContextValue {
  isLoading: boolean;
  session: AuthSession | null;
  isAuthenticated: boolean;
  signIn: (session: AuthSession) => void;
  signOut: () => void;
  hasRole: (role: FitoraRole) => boolean;
  hasAnyRole: (roles: FitoraRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  hydrate,
}: {
  children: ReactNode;
  hydrate?: () => Promise<AuthSession | null>;
}) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const restored = await (hydrate?.() ?? Promise.resolve(null));
        if (active) setSession(restored);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, [hydrate]);

  const value = useMemo<AuthContextValue>(() => {
    const roles = session?.roles ?? [];

    return {
      isLoading,
      session,
      isAuthenticated: Boolean(session?.accessToken),
      signIn: (nextSession: AuthSession) => setSession(nextSession),
      signOut: () => setSession(null),
      hasRole: (role: FitoraRole) => roles.includes(role),
      hasAnyRole: (candidateRoles: FitoraRole[]) =>
        candidateRoles.some((role: FitoraRole) => roles.includes(role)),
    };
  }, [isLoading, session]);

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function canAccessRole(session: AuthSession | null, role: FitoraRole) {
  return Boolean(session?.roles.includes(role));
}
