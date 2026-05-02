import AsyncStorage from '@react-native-async-storage/async-storage';

export type ApologyRecord = {
  title: string;
  body: string;
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
