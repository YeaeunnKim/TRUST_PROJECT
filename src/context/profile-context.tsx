import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/src/context/auth-context';
import { getSupabaseClient, isSupabaseConfigured } from '@/src/lib/supabaseClient';
import type { Profile } from '@/src/models/profile';
import { emptyProfile } from '@/src/models/profile';

type ProfileContextValue = {
  profile: Profile | null;
  isLoading: boolean;
  updateProfile: (next: Profile) => Promise<void>;
  reload: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

type ProfileRow = {
  user_id: string;
  name: string | null;
  age: string | null;
  relationship_start_date: string | null;
  photo_uri: string | null;
};

function rowToProfile(row: ProfileRow | null): Profile | null {
  if (!row) return null;
  return {
    name: row.name ?? '',
    age: row.age ?? '',
    relationshipStartDate: row.relationship_start_date ?? '',
    photoUri: row.photo_uri ?? undefined,
  };
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle<ProfileRow>();
    setProfile(rowToProfile(data ?? null));
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateProfile = useCallback(
    async (next: Profile) => {
      if (!user || !isSupabaseConfigured()) {
        setProfile(next);
        return;
      }
      setProfile(next);
      const supabase = getSupabaseClient();
      const payload = {
        user_id: user.id,
        name: next.name,
        age: next.age,
        relationship_start_date: next.relationshipStartDate || null,
        photo_uri: next.photoUri ?? null,
      };
      await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });
    },
    [user],
  );

  const value = useMemo(
    () => ({ profile, isLoading, updateProfile, reload }),
    [profile, isLoading, updateProfile, reload],
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

export { emptyProfile };
