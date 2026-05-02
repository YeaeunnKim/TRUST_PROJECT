import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/src/context/auth-context';
import { useCouple } from '@/src/context/couple-context';
import { getSupabaseClient, isSupabaseConfigured } from '@/src/lib/supabaseClient';

const HEARTBEAT_INTERVAL_MS = 30_000;
const PARTNER_POLL_INTERVAL_MS = 15_000;

export type UserStatus = {
  userId: string;
  sleepMode: boolean;
  lastActiveAt: string | null;
  trustScore: number;
};

export type PebbleOutcome = {
  outcome: 'bounced' | 'hit' | 'no_op';
  targetSleepMode: boolean;
  targetActiveRecently: boolean;
  trustChange: number;
  targetTrustScore: number;
};

type StatusRow = {
  user_id: string;
  sleep_mode: boolean;
  last_active_at: string | null;
  trust_score: number;
};

function rowToStatus(row: StatusRow): UserStatus {
  return {
    userId: row.user_id,
    sleepMode: row.sleep_mode,
    lastActiveAt: row.last_active_at,
    trustScore: row.trust_score,
  };
}

type PresenceContextValue = {
  myStatus: UserStatus | null;
  partnerStatus: UserStatus | null;
  isToggling: boolean;
  setSleepMode: (enabled: boolean) => Promise<void>;
  throwPebble: (targetUserId: string) => Promise<PebbleOutcome>;
  refresh: () => Promise<void>;
};

const PresenceContext = createContext<PresenceContextValue | null>(null);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { myCouple } = useCouple();
  const [myStatus, setMyStatus] = useState<UserStatus | null>(null);
  const [partnerStatus, setPartnerStatus] = useState<UserStatus | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const partnerPollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const partnerId = useMemo(() => {
    if (!user || !myCouple) return null;
    const peer = myCouple.members.find((m) => m.userId !== user.id);
    return peer?.userId ?? null;
  }, [user, myCouple]);

  const ensureRowAndFetchMine = useCallback(async (): Promise<UserStatus | null> => {
    if (!user || !isSupabaseConfigured()) return null;
    const supabase = getSupabaseClient();
    // 처음 호출 시 user_status 행 없으면 만들기
    await supabase
      .from('user_status')
      .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true });
    const { data } = await supabase
      .from('user_status')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle<StatusRow>();
    return data ? rowToStatus(data) : null;
  }, [user]);

  const fetchPartner = useCallback(async (): Promise<UserStatus | null> => {
    if (!partnerId || !isSupabaseConfigured()) return null;
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('user_status')
      .select('*')
      .eq('user_id', partnerId)
      .maybeSingle<StatusRow>();
    return data ? rowToStatus(data) : null;
  }, [partnerId]);

  const refresh = useCallback(async () => {
    const [mine, partner] = await Promise.all([ensureRowAndFetchMine(), fetchPartner()]);
    setMyStatus(mine);
    setPartnerStatus(partner);
  }, [ensureRowAndFetchMine, fetchPartner]);

  // 초기 로드 + auth/couple 변경 시
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Heartbeat: 앱 active일 때만 last_active_at 핑
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    const supabase = getSupabaseClient();

    const ping = async () => {
      const now = new Date().toISOString();
      await supabase
        .from('user_status')
        .upsert({ user_id: user.id, last_active_at: now }, { onConflict: 'user_id' });
      setMyStatus((prev) =>
        prev ? { ...prev, lastActiveAt: now } : { userId: user.id, sleepMode: false, lastActiveAt: now, trustScore: 100 },
      );
    };

    const start = () => {
      if (heartbeatTimer.current) return;
      void ping();
      heartbeatTimer.current = setInterval(() => void ping(), HEARTBEAT_INTERVAL_MS);
    };
    const stop = () => {
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current);
        heartbeatTimer.current = null;
      }
    };

    if (AppState.currentState === 'active') start();

    const handler = (state: AppStateStatus) => {
      if (state === 'active') start();
      else stop();
    };
    const sub = AppState.addEventListener('change', handler);
    return () => {
      stop();
      sub.remove();
    };
  }, [user]);

  // 상대 상태 폴링 (active 일 때만)
  useEffect(() => {
    if (!partnerId) {
      if (partnerPollTimer.current) {
        clearInterval(partnerPollTimer.current);
        partnerPollTimer.current = null;
      }
      return;
    }

    const start = () => {
      if (partnerPollTimer.current) return;
      void fetchPartner().then((s) => setPartnerStatus(s));
      partnerPollTimer.current = setInterval(async () => {
        const s = await fetchPartner();
        setPartnerStatus(s);
      }, PARTNER_POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (partnerPollTimer.current) {
        clearInterval(partnerPollTimer.current);
        partnerPollTimer.current = null;
      }
    };

    if (AppState.currentState === 'active') start();

    const handler = (state: AppStateStatus) => {
      if (state === 'active') start();
      else stop();
    };
    const sub = AppState.addEventListener('change', handler);
    return () => {
      stop();
      sub.remove();
    };
  }, [partnerId, fetchPartner]);

  const setSleepMode = useCallback(
    async (enabled: boolean) => {
      if (!user || !isSupabaseConfigured()) return;
      setIsToggling(true);
      try {
        const supabase = getSupabaseClient();
        await supabase
          .from('user_status')
          .upsert({ user_id: user.id, sleep_mode: enabled }, { onConflict: 'user_id' });
        setMyStatus((prev) =>
          prev
            ? { ...prev, sleepMode: enabled }
            : { userId: user.id, sleepMode: enabled, lastActiveAt: null, trustScore: 100 },
        );
      } finally {
        setIsToggling(false);
      }
    },
    [user],
  );

  const throwPebble = useCallback(async (targetUserId: string): Promise<PebbleOutcome> => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase가 설정되지 않았어요.');
    }
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .rpc('throw_pebble', { p_target_user_id: targetUserId })
      .single<{
        outcome: 'bounced' | 'hit' | 'no_op';
        target_sleep_mode: boolean;
        target_active_recently: boolean;
        trust_change: number;
        target_trust_score: number;
      }>();
    if (error || !data) {
      throw new Error(error?.message ?? '돌을 던지지 못했어요.');
    }
    // 상대 점수 즉시 반영
    setPartnerStatus((prev) =>
      prev
        ? { ...prev, trustScore: data.target_trust_score }
        : prev,
    );
    return {
      outcome: data.outcome,
      targetSleepMode: data.target_sleep_mode,
      targetActiveRecently: data.target_active_recently,
      trustChange: data.trust_change,
      targetTrustScore: data.target_trust_score,
    };
  }, []);

  const value = useMemo(
    () => ({ myStatus, partnerStatus, isToggling, setSleepMode, throwPebble, refresh }),
    [myStatus, partnerStatus, isToggling, setSleepMode, throwPebble, refresh],
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const ctx = useContext(PresenceContext);
  if (!ctx) {
    throw new Error('usePresence must be used within PresenceProvider');
  }
  return ctx;
}
