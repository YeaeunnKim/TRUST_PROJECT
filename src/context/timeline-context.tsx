import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { TimelineEntry } from '@/src/models/timeline-entry';
import { loadTimelineEntries, saveTimelineEntries } from '@/src/storage/timeline-storage';

type TimelineContextValue = {
  entries: TimelineEntry[];
  isLoading: boolean;
  addEntry: (entry: TimelineEntry) => Promise<void>;
  reload: () => Promise<void>;
};

const TimelineContext = createContext<TimelineContextValue | null>(null);

export function TimelineProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const loaded = await loadTimelineEntries();
    setEntries(loaded);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addEntry = useCallback(
    async (entry: TimelineEntry) => {
      const updated = [entry, ...entries.filter((item) => item.id !== entry.id)];
      setEntries(updated);
      await saveTimelineEntries(updated);
    },
    [entries]
  );

  const value = useMemo(
    () => ({
      entries,
      isLoading,
      addEntry,
      reload,
    }),
    [entries, isLoading, addEntry, reload]
  );

  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>;
}

export function useTimeline() {
  const ctx = useContext(TimelineContext);
  if (!ctx) {
    throw new Error('useTimeline must be used within TimelineProvider');
  }
  return ctx;
}
