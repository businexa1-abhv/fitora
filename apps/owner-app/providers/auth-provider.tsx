import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthResponse, AuthUser } from '@fitora/shared';
import { UserRole } from '@fitora/shared';
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  getStoredAppMode,
  getStoredUser,
  saveAuthSession,
  type AppMode,
} from '@/lib/auth';
import { logout as logoutApi } from '@/lib/auth-api';
import { getMySubscription } from '@/lib/owner-api';
import { registerForPushNotifications } from '@/lib/push';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOwner: boolean;
  isTrainer: boolean;
  /** True when the owner's subscription is EXPIRED (not ACTIVE or GRACE). */
  isSubscriptionExpired: boolean;
  /** UI mode chosen at login (Owner vs Coach tab). */
  appMode: AppMode;
  /** True when the session should show the coach Stitch shell. */
  isCoachMode: boolean;
  signIn: (response: AuthResponse, mode?: AppMode) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function resolveAppMode(roles: UserRole[], preferred: AppMode): AppMode {
  const isOwner = roles.includes(UserRole.COURT_OWNER) || roles.includes(UserRole.ADMIN);
  const isTrainer = roles.includes(UserRole.TRAINER);
  if (preferred === 'coach' && isTrainer) return 'coach';
  if (preferred === 'owner' && isOwner) return 'owner';
  if (isTrainer && !isOwner) return 'coach';
  return 'owner';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [appMode, setAppMode] = useState<AppMode>('owner');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [storedUser, accessToken, storedMode] = await Promise.all([
          getStoredUser(),
          getAccessToken(),
          getStoredAppMode(),
        ]);
        setUser(storedUser);
        setToken(accessToken);
        if (storedUser) {
          setAppMode(resolveAppMode(storedUser.roles ?? [], storedMode));
        }
        if (accessToken) {
          registerForPushNotifications(accessToken).catch(() => undefined);
          getMySubscription(accessToken)
            .then((sub) => {
              if (sub && sub.status !== 'ACTIVE' && sub.status !== 'GRACE') {
                setIsSubscriptionExpired(true);
              }
            })
            .catch(() => undefined);
        }
      } finally {
        setIsLoading(false);
      }
    }
    void bootstrap();
  }, []);

  const signIn = useCallback(async (response: AuthResponse, mode: AppMode = 'owner') => {
    const resolved = resolveAppMode(response.user.roles ?? [], mode);
    await saveAuthSession(response, resolved);
    setUser(response.user);
    setToken(response.tokens.accessToken);
    setAppMode(resolved);
    registerForPushNotifications(response.tokens.accessToken).catch(() => undefined);
    getMySubscription(response.tokens.accessToken)
      .then((sub) => {
        if (sub && sub.status !== 'ACTIVE' && sub.status !== 'GRACE') {
          setIsSubscriptionExpired(true);
        } else {
          setIsSubscriptionExpired(false);
        }
      })
      .catch(() => undefined);
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
    setAppMode('owner');
  }, []);

  const roles = user?.roles ?? [];
  const isOwner = roles.includes(UserRole.COURT_OWNER) || roles.includes(UserRole.ADMIN);
  const isTrainer = roles.includes(UserRole.TRAINER);
  const isCoachMode = appMode === 'coach' && isTrainer;

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user && token),
      isOwner,
      isTrainer,
      isSubscriptionExpired,
      appMode,
      isCoachMode,
      signIn,
      signOut,
    }),
    [
      user,
      token,
      isLoading,
      isOwner,
      isTrainer,
      isSubscriptionExpired,
      appMode,
      isCoachMode,
      signIn,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
