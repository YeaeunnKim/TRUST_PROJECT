import AsyncStorage from '@react-native-async-storage/async-storage';

export type ApologyRecord = {
  title: string;
  body: string;
};

export type ApologyHistoryItem = ApologyRecord & {
  dateKey: string;
};

const APOLOGY_KEY_PREFIX = 'birdguard.apology.v1.';

export async function loadApology(dateKey: string): Promise<ApologyRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(APOLOGY_KEY_PREFIX + dateKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApologyRecord;
    return parsed && typeof parsed.title === 'string' && typeof parsed.body === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveApology(dateKey: string, apology: ApologyRecord): Promise<void> {
  await AsyncStorage.setItem(APOLOGY_KEY_PREFIX + dateKey, JSON.stringify(apology));
}

export async function loadAllApologies(): Promise<ApologyHistoryItem[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const apologyKeys = keys.filter((key) => key.startsWith(APOLOGY_KEY_PREFIX));
    const entries = await AsyncStorage.multiGet(apologyKeys);
    const items: ApologyHistoryItem[] = entries
      .map(([key, value]) => {
        if (!value) return null;
        try {
          const parsed = JSON.parse(value) as ApologyRecord;
          if (parsed && typeof parsed.title === 'string' && typeof parsed.body === 'string') {
            return {
              dateKey: key.replace(APOLOGY_KEY_PREFIX, ''),
              ...parsed,
            };
          }
        } catch {
          return null;
        }
        return null;
      })
      .filter((item): item is ApologyHistoryItem => item !== null)
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    return items;
  } catch {
    return [];
  }
}
