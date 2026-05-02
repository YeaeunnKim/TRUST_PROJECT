import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/src/context/auth-context';
import {
  createCoupleInvite,
  disconnectCouple,
  getMyCouple,
  joinCoupleByCode,
} from '@/src/lib/couple';
import type { Couple } from '@/src/models/couple';

type CoupleContextValue = {
  myCouple: Couple | null;
  isLoading: boolean;
  error: string | null;
  createInvite: () => Promise<void>;
  joinByCode: (code: string) => Promise<void>;
  disconnect: () => Promise<void>;
  clearError: () => void;
};

const CoupleContext = createContext<CoupleContextValue | null>(null);

export function CoupleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [myCouple, setMyCouple] = useState<Couple | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setMyCouple(null);
      return;
    }
    const couple = await getMyCouple(user.id);
    setMyCouple(couple);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createInvite = useCallback(async () => {
    if (!user) return;
    setError(null);
    setIsLoading(true);
    try {
      const couple = await createCoupleInvite(user.id, user.username);
      setMyCouple(couple);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했어요.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const joinByCode = useCallback(
    async (code: string) => {
      if (!user) return;
      setError(null);
      setIsLoading(true);
      try {
        const couple = await joinCoupleByCode(code, user.id, user.username);
        setMyCouple(couple);
      } catch (e) {
        setError(e instanceof Error ? e.message : '오류가 발생했어요.');
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  const disconnect = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await disconnectCouple(user.id);
      setMyCouple(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했어요.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({ myCouple, isLoading, error, createInvite, joinByCode, disconnect, clearError }),
    [myCouple, isLoading, error, createInvite, joinByCode, disconnect, clearError]
  );

  return <CoupleContext.Provider value={value}>{children}</CoupleContext.Provider>;
}

export function useCouple() {
  const ctx = useContext(CoupleContext);
  if (!ctx) throw new Error('useCouple must be used within CoupleProvider');
  return ctx;
}
