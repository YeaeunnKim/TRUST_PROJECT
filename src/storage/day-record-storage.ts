import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DayRecord } from '@/src/models/day-record';

const RECORDS_KEY = 'birdguard.day_records.v1';

export async function loadDayRecords(): Promise<DayRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DayRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveDayRecords(records: DayRecord[]): Promise<void> {
  await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}
