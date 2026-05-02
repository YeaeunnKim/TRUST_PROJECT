import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export type ActivityEventType =
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'APP_BACKGROUND'
  | 'APP_INACTIVE'
  | 'APP_FOREGROUND'
  | 'RETURN_FROM_HIDDEN';

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  timestamp: number;
  appState?: AppStateStatus;
  hiddenDurationSec?: number;
};

export type ActivitySession = {
  id: string;
  startedAt: number;
};

export type UseActivitySessionOptions = {
  hiddenReturnThresholdSec?: number;
  maxEvents?: number;
  onEvent?: (event: ActivityEvent) => void;
  onLongReturn?: (durationSec: number) => void;
};

export type UseActivitySessionResult = {
  session: ActivitySession | null;
  events: ActivityEvent[];
  start: () => void;
  stop: () => void;
  clearEvents: () => void;
};

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useActivitySession(
  options: UseActivitySessionOptions = {},
): UseActivitySessionResult {
  const {
    hiddenReturnThresholdSec = 15,
    maxEvents = 200,
    onEvent,
    onLongReturn,
  } = options;

  const [session, setSession] = useState<ActivitySession | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  const sessionRef = useRef<ActivitySession | null>(null);
  const hiddenAtRef = useRef<number | null>(null);
  const lastStateRef = useRef<AppStateStatus>(AppState.currentState);
  const onEventRef = useRef(onEvent);
  const onLongReturnRef = useRef(onLongReturn);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    onLongReturnRef.current = onLongReturn;
  }, [onLongReturn]);

  const pushEvent = useCallback(
    (type: ActivityEventType, extra?: Partial<ActivityEvent>) => {
      const ev: ActivityEvent = {
        id: makeId(type),
        type,
        timestamp: Date.now(),
        ...extra,
      };
      setEvents((prev) => {
        const next = [...prev, ev];
        if (next.length > maxEvents) {
          return next.slice(next.length - maxEvents);
        }
        return next;
      });
      onEventRef.current?.(ev);
      return ev;
    },
    [maxEvents],
  );

  const start = useCallback(() => {
    if (sessionRef.current) return;
    const next: ActivitySession = {
      id: makeId('session'),
      startedAt: Date.now(),
    };
    sessionRef.current = next;
    hiddenAtRef.current = null;
    lastStateRef.current = AppState.currentState;
    setSession(next);
    setEvents([]);
    pushEvent('SESSION_STARTED');
  }, [pushEvent]);

  const stop = useCallback(() => {
    if (!sessionRef.current) return;
    pushEvent('SESSION_ENDED');
    sessionRef.current = null;
    hiddenAtRef.current = null;
    setSession(null);
  }, [pushEvent]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    if (!session) return;

    const handleChange = (nextState: AppStateStatus) => {
      if (!sessionRef.current) return;
      const prevState = lastStateRef.current;
      lastStateRef.current = nextState;

      if (nextState === 'background' || nextState === 'inactive') {
        if (prevState === 'active') {
          hiddenAtRef.current = Date.now();
        }
        pushEvent(nextState === 'background' ? 'APP_BACKGROUND' : 'APP_INACTIVE', {
          appState: nextState,
        });
        return;
      }

      if (nextState === 'active') {
        const hiddenAt = hiddenAtRef.current;
        hiddenAtRef.current = null;
        pushEvent('APP_FOREGROUND', { appState: nextState });
        if (hiddenAt) {
          const dur = Math.round((Date.now() - hiddenAt) / 1000);
          if (dur >= hiddenReturnThresholdSec) {
            pushEvent('RETURN_FROM_HIDDEN', {
              hiddenDurationSec: dur,
              appState: nextState,
            });
            onLongReturnRef.current?.(dur);
          }
        }
      }
    };

    const sub = AppState.addEventListener('change', handleChange);
    return () => {
      sub.remove();
    };
  }, [session, hiddenReturnThresholdSec, pushEvent]);

  return { session, events, start, stop, clearEvents };
}
