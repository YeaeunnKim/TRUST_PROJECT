import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CoupleStore } from '@/src/models/couple';

const COUPLE_STORE_KEY = 'birdguard.couple.store.v1';

function emptyStore(): CoupleStore {
  return { couples: {}, userCoupleMap: {} };
}

export async function loadCoupleStore(): Promise<CoupleStore> {
  try {
    const raw = await AsyncStorage.getItem(COUPLE_STORE_KEY);
    if (!raw) return emptyStore();
    return JSON.parse(raw) as CoupleStore;
  } catch {
    return emptyStore();
  }
}

export async function saveCoupleStore(store: CoupleStore): Promise<void> {
  await AsyncStorage.setItem(COUPLE_STORE_KEY, JSON.stringify(store));
}
