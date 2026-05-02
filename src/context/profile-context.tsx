import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { Profile } from '@/src/models/profile';
import { loadProfile, saveProfile } from '@/src/storage/profile-storage';

type ProfileContextValue = {
  profile: Profile | null;
  isLoading: boolean;
  updateProfile: (next: Profile) => Promise<void>;
  reload: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const loaded = await loadProfile();
    setProfile(loaded);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateProfile = useCallback(async (next: Profile) => {
    setProfile(next);
    await saveProfile(next);
  }, []);

  const value = useMemo(
    () => ({
      profile,
      isLoading,
      updateProfile,
      reload,
    }),
    [profile, isLoading, updateProfile, reload]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return ctx;
}
