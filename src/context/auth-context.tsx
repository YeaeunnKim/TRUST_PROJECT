import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { AuthCredentials, AuthUser } from '@/src/storage/auth-storage';
import { loadAuthCredentials, loadAuthUser, saveAuthCredentials, saveAuthUser } from '@/src/storage/auth-storage';

type AuthResult = {
  ok: boolean;
  message?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<AuthResult>;
  signUp: (username: string, password: string) => Promise<AuthResult>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeUsername(username: string) {
  return username.trim();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const stored = await loadAuthUser();
      setUser(stored);
      setIsLoading(false);
    };
    void load();
  }, []);

  const signUp = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    const safeUsername = normalizeUsername(username);
    if (!safeUsername || !password) {
      return { ok: false, message: '모든 항목을 채워주세요.' };
    }
    const id = `user_${Date.now()}`;
    const cred: AuthCredentials = {
      id,
      username: safeUsername,
      password,
    };
    await saveAuthCredentials(cred);
    return { ok: true };
  }, []);

  const signIn = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    const safeUsername = normalizeUsername(username);
    const stored = await loadAuthCredentials();
    if (!stored) {
      return { ok: false, message: '먼저 회원가입이 필요해요.' };
    }
    if (stored.username !== safeUsername || stored.password !== password) {
      return { ok: false, message: '아이디 또는 비밀번호가 맞지 않아요.' };
    }
    const nextUser: AuthUser = { id: stored.id, username: stored.username };
    await saveAuthUser(nextUser);
    setUser(nextUser);
    return { ok: true };
  }, []);

  const signInAsGuest = useCallback(async () => {
    const nextUser: AuthUser = { id: `guest_${Date.now()}`, username: '테스트' };
    await saveAuthUser(nextUser);
    setUser(nextUser);
  }, []);

  const signOut = useCallback(async () => {
    await saveAuthUser(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      signIn,
      signUp,
      signInAsGuest,
      signOut,
    }),
    [user, isLoading, signIn, signUp, signInAsGuest, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
