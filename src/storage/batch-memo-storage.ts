import AsyncStorage from '@react-native-async-storage/async-storage';

const BATCH_MEMO_KEY = 'birdguard.batch_memo_dates.v1';

export async function savePendingBatchDates(dates: string[]): Promise<void> {
  await AsyncStorage.setItem(BATCH_MEMO_KEY, JSON.stringify(dates));
}

export async function loadPendingBatchDates(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(BATCH_MEMO_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function clearPendingBatchDates(): Promise<void> {
  await AsyncStorage.removeItem(BATCH_MEMO_KEY);
}
