'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthResponse, AuthUser } from '@fitora/shared';
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  saveAuthSession,
} from '@/lib/auth';
import { getMe, logout as logoutApi, logoutAll } from '@/lib/auth-api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (response: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [storedUser, accessToken] = await Promise.all([
          getStoredUser(),
          getAccessToken(),
        ]);
        setUser(storedUser);
        setToken(accessToken);

        if (accessToken) {
          try {
            const me = await getMe(accessToken);
            setUser(me);
            const refresh = await getRefreshToken();
            if (refresh) {
              await saveAuthSession({
                user: me,
                tokens: { accessToken, refreshToken: refresh },
              });
            }
          } catch {
            // keep cached user if offline
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    bootstrap();
  }, []);

  const signIn = useCallback(async (response: AuthResponse) => {
    await saveAuthSession(response);
    setUser(response.user);
    setToken(response.tokens.accessToken);
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    const accessToken = await getAccessToken();
    try {
      if (refreshToken) await logoutApi(refreshToken);
      else if (accessToken) await logoutAll(accessToken);
    } catch {
      // clear local session even if API fails
    }
    await clearAuthSession();
    setUser(null);
    setToken(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setUser(null);
      setToken(null);
      return;
    }
    try {
      const me = await getMe(accessToken);
      const refresh = await getRefreshToken();
      if (refresh) {
        await saveAuthSession({
          user: me,
          tokens: { accessToken, refreshToken: refresh },
        });
      }
      setUser(me);
      setToken(accessToken);
    } catch {
      const storedUser = await getStoredUser();
      setUser(storedUser);
      setToken(accessToken);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user && token),
      signIn,
      signOut,
      refreshUser,
    }),
    [user, token, isLoading, signIn, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
