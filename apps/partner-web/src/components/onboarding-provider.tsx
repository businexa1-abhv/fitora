'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getStoredApplicationId,
  partnerApi,
  setStoredApplicationId,
  type PartnerApplication,
} from '@/lib/api';

type OnboardingContextValue = {
  application: PartnerApplication | null;
  loading: boolean;
  error: string;
  ensureDraft: () => Promise<PartnerApplication>;
  refresh: () => Promise<void>;
  setApplication: (app: PartnerApplication) => void;
  clearError: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [application, setApplication] = useState<PartnerApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const id = getStoredApplicationId();
    if (!id) {
      setApplication(null);
      setLoading(false);
      return;
    }
    try {
      const app = await partnerApi.get(id);
      setApplication(app);
    } catch {
      setApplication(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ensureDraft = useCallback(async () => {
    const existingId = getStoredApplicationId();
    if (existingId) {
      try {
        const app = await partnerApi.get(existingId);
        if (app.status === 'DRAFT') {
          setApplication(app);
          return app;
        }
      } catch {
        // create a new draft below
      }
    }
    const draft = await partnerApi.createDraft();
    setStoredApplicationId(draft.id);
    setApplication(draft);
    return draft;
  }, []);

  const value = useMemo(
    () => ({
      application,
      loading,
      error,
      ensureDraft,
      refresh,
      setApplication: (app: PartnerApplication) => {
        setStoredApplicationId(app.id);
        setApplication(app);
        setError('');
      },
      clearError: () => setError(''),
    }),
    [application, loading, error, ensureDraft, refresh],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
