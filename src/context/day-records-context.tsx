import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { CreateTodayRecordInput, DayRecord } from '@/src/models/day-record';
import type { BirdState } from '@/src/models/bird-state';
import { getSeoulDateKey } from '@/src/utils/date';
import { loadDayRecords, saveDayRecords } from '@/src/storage/day-record-storage';

type DayRecordsContextValue = {
  records: DayRecord[];
  isLoading: boolean;
  addOrUpdateToday: (input: CreateTodayRecordInput) => Promise<DayRecord>;
  markLearnedToday: (birdState?: BirdState) => Promise<DayRecord | null>;
  markImmediateRiskShown: (dateKey: string) => Promise<DayRecord | null>;
  reload: () => Promise<void>;
};

const DayRecordsContext = createContext<DayRecordsContextValue | null>(null);

function createId(dateKey: string) {
  return `day_${dateKey}`;
}

export function DayRecordsProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const normalizeRecord = useCallback((record: DayRecord): DayRecord => {
    return {
      ...record,
      learned: record.learned ?? false,
      immediateRisk: record.immediateRisk ?? {
        scamUrl: false,
        reportedAccount: false,
        aiImage: false,
      },
      immediateRiskShown: record.immediateRiskShown ?? false,
    };
  }, []);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const loaded = await loadDayRecords();
    const normalized = loaded.map(normalizeRecord);
    setRecords(normalized);
    await saveDayRecords(normalized);
    setIsLoading(false);
  }, [normalizeRecord]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addOrUpdateToday = useCallback(
    async (input: CreateTodayRecordInput) => {
      const todayKey = getSeoulDateKey();
      const now = new Date().toISOString();

      let updated: DayRecord[];
      const existing = records.find((record) => record.date === todayKey);
      if (existing) {
        const nextRecord: DayRecord = {
          ...existing,
          extractedSentences: input.extractedSentences,
          nativeSentences: input.nativeSentences ?? existing.nativeSentences,
          sourceFileName: input.sourceFileName ?? existing.sourceFileName,
          flags: input.flags,
          immediateRisk: input.immediateRisk ?? existing.immediateRisk ?? {
            scamUrl: false,
            reportedAccount: false,
            aiImage: false,
          },
          immediateRiskShown: existing.immediateRiskShown ?? false,
          uploadCount: existing.uploadCount + 1,
          learned: false,
          updatedAt: now,
        };
        updated = records.map((record) => (record.date === todayKey ? nextRecord : record));
      } else {
        const nextRecord: DayRecord = {
          id: createId(todayKey),
          date: todayKey,
          source: 'kakaotalk_txt',
          sourceFileName: input.sourceFileName,
          extractedSentences: input.extractedSentences,
          nativeSentences: input.nativeSentences,
          flags: input.flags,
          uploadCount: 1,
          learned: false,
          immediateRisk: input.immediateRisk ?? {
            scamUrl: false,
            reportedAccount: false,
            aiImage: false,
          },
          immediateRiskShown: false,
          createdAt: now,
          updatedAt: now,
        };
        updated = [nextRecord, ...records];
      }

      setRecords(updated);
      await saveDayRecords(updated);
      return updated[0];
    },
    [records]
  );

  const markLearnedToday = useCallback(async (birdState?: BirdState) => {
    const todayKey = getSeoulDateKey();
    const now = new Date().toISOString();
    const existing = records.find((record) => record.date === todayKey);
    if (!existing) return null;

    const nextRecord: DayRecord = {
      ...existing,
      learned: true,
      birdState: birdState ?? existing.birdState,
      updatedAt: now,
    };
    const updated = records.map((record) => (record.date === todayKey ? nextRecord : record));
    setRecords(updated);
    await saveDayRecords(updated);
    return nextRecord;
  }, [records]);

  const markImmediateRiskShown = useCallback(
    async (dateKey: string) => {
      const now = new Date().toISOString();
      const existing = records.find((record) => record.date === dateKey);
      if (!existing) return null;

      const nextRecord: DayRecord = {
        ...existing,
        immediateRiskShown: true,
        updatedAt: now,
      };
      const updated = records.map((record) => (record.date === dateKey ? nextRecord : record));
      setRecords(updated);
      await saveDayRecords(updated);
      return nextRecord;
    },
    [records]
  );

  const value = useMemo(
    () => ({
      records,
      isLoading,
      addOrUpdateToday,
      markLearnedToday,
      markImmediateRiskShown,
      reload,
    }),
    [records, isLoading, addOrUpdateToday, markLearnedToday, markImmediateRiskShown, reload]
  );

  return <DayRecordsContext.Provider value={value}>{children}</DayRecordsContext.Provider>;
}

export function useDayRecords() {
  const ctx = useContext(DayRecordsContext);
  if (!ctx) {
    throw new Error('useDayRecords must be used within DayRecordsProvider');
  }
  return ctx;
}
