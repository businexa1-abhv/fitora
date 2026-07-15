import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthResponse, AuthUser } from '@fitora/shared';
import { UserRole } from '@fitora/shared';
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  saveAuthSession,
} from '@/lib/auth';
import { logout as logoutApi } from '@/lib/auth-api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOwner: boolean;
  isTrainer: boolean;
  signIn: (response: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [storedUser, accessToken] = await Promise.all([getStoredUser(), getAccessToken()]);
        setUser(storedUser);
        setToken(accessToken);
      } finally {
        setIsLoading(false);
      }
    }
    void bootstrap();
  }, []);

  const signIn = useCallback(async (response: AuthResponse) => {
    await saveAuthSession(response);
    setUser(response.user);
    setToken(response.tokens.accessToken);
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    try {
      if (refreshToken) await logoutApi(refreshToken);
    } catch {
      // clear local even if API fails
    }
    await clearAuthSession();
    setUser(null);
    setToken(null);
  }, []);

  const roles = user?.roles ?? [];
  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user && token),
      isOwner: roles.includes(UserRole.COURT_OWNER) || roles.includes(UserRole.ADMIN),
      isTrainer: roles.includes(UserRole.TRAINER),
      signIn,
      signOut,
    }),
    [user, token, isLoading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
