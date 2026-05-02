import type { AuthError, Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getSupabaseClient, isSupabaseConfigured } from '@/src/lib/supabaseClient';

export type AuthUser = {
  id: string;
  username: string;
};

type AuthResult = {
  ok: boolean;
  message?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (loginId: string, password: string) => Promise<AuthResult>;
  signUp: (loginId: string, password: string, displayName: string) => Promise<AuthResult>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const FAKE_EMAIL_DOMAIN = 'birdguard.local';
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,30}$/;

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

function usernameToEmail(username: string): string {
  return `${username}@${FAKE_EMAIL_DOMAIN}`;
}

function validateUsername(username: string): string | null {
  if (!username) return '아이디를 입력해주세요.';
  if (!USERNAME_PATTERN.test(username)) {
    return '아이디는 영문/숫자/_/- 3~30자만 사용할 수 있어요.';
  }
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return '비밀번호를 입력해주세요.';
  if (password.length < 6) return '비밀번호는 6자 이상이어야 해요.';
  return null;
}

function sessionToUser(session: Session | null): AuthUser | null {
  const supaUser = session?.user;
  if (!supaUser) return null;
  const meta = supaUser.user_metadata ?? {};
  const username =
    typeof meta.username === 'string' && meta.username.trim().length > 0
      ? meta.username
      : supaUser.is_anonymous
        ? '게스트'
        : (supaUser.email?.split('@')[0] ?? '사용자');
  return { id: supaUser.id, username };
}

function authErrorMessage(error: AuthError | null | undefined): string {
  if (!error) return '오류가 발생했어요.';
  const msg = error.message ?? '';
  if (/already registered|already exists/i.test(msg)) return '이미 사용 중인 아이디예요.';
  if (/invalid login credentials/i.test(msg)) return '아이디 또는 비밀번호가 맞지 않아요.';
  if (/email not confirmed/i.test(msg))
    return '이메일 인증이 필요한 계정이에요. Supabase 대시보드에서 Confirm email을 꺼주세요.';
  return msg || '오류가 발생했어요.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }
    const supabase = getSupabaseClient();
    let mounted = true;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setUser(sessionToUser(data.session));
      setIsLoading(false);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(sessionToUser(session));
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(
    async (rawLoginId: string, password: string, rawDisplayName: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured()) return { ok: false, message: 'Supabase 설정이 필요해요.' };
      const loginId = normalizeUsername(rawLoginId);
      const loginIdErr = validateUsername(loginId);
      if (loginIdErr) return { ok: false, message: loginIdErr };
      const passwordErr = validatePassword(password);
      if (passwordErr) return { ok: false, message: passwordErr };
      const displayName = rawDisplayName.trim();
      if (!displayName) return { ok: false, message: '이름을 입력해주세요.' };

      const supabase = getSupabaseClient();
      const email = usernameToEmail(loginId);
      const { data: existing } = await supabase.auth.getUser();

      if (existing.user?.is_anonymous) {
        // 익명 세션을 정식 계정으로 업그레이드 → user.id 보존 (커플 데이터 유지)
        const { error } = await supabase.auth.updateUser({
          email,
          password,
          data: { username: displayName },
        });
        if (error) return { ok: false, message: authErrorMessage(error) };
        return { ok: true };
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: displayName } },
      });
      if (error) return { ok: false, message: authErrorMessage(error) };
      return { ok: true };
    },
    [],
  );

  const signIn = useCallback(async (rawLoginId: string, password: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured()) return { ok: false, message: 'Supabase 설정이 필요해요.' };
    const loginId = normalizeUsername(rawLoginId);
    const loginIdErr = validateUsername(loginId);
    if (loginIdErr) return { ok: false, message: loginIdErr };

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(loginId),
      password,
    });
    if (error) return { ok: false, message: authErrorMessage(error) };
    return { ok: true };
  }, []);

  const signInAsGuest = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    if (data.session) return; // 이미 어떤 세션이든 있으면 그대로
    await supabase.auth.signInAnonymously();
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setUser(null);
      return;
    }
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, signIn, signUp, signInAsGuest, signOut }),
    [user, isLoading, signIn, signUp, signInAsGuest, signOut],
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
