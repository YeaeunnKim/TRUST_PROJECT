import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthUser = {
  id: string;
  username: string;
};

export type AuthCredentials = {
  id: string;
  username: string;
  password: string;
};

const USER_KEY = 'birdguard.auth.user';
const CRED_KEY = 'birdguard.auth.cred';

export async function loadAuthUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function saveAuthUser(user: AuthUser | null): Promise<void> {
  if (!user) {
    await AsyncStorage.removeItem(USER_KEY);
    return;
  }
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function loadAuthCredentials(): Promise<AuthCredentials | null> {
  const raw = await AsyncStorage.getItem(CRED_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthCredentials;
  } catch {
    return null;
  }
}

export async function saveAuthCredentials(cred: AuthCredentials | null): Promise<void> {
  if (!cred) {
    await AsyncStorage.removeItem(CRED_KEY);
    return;
  }
  await AsyncStorage.setItem(CRED_KEY, JSON.stringify(cred));
}
