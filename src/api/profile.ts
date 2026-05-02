import { apiFetch } from '@/src/api/client';
import type { Profile } from '@/src/models/profile';

type ProfileResponse = {
  nickname: string | null;
  partner_name: string | null;
  partner_country: string | null;
  partner_job: string | null;
  language: string | null;
};

function mapProfileResponse(response: ProfileResponse): Profile {
  return {
    nickname: response.nickname ?? '',
    partnerName: response.partner_name ?? '',
    partnerCountry: response.partner_country ?? '',
    partnerJob: response.partner_job ?? '',
    language: response.language ?? 'ko',
  };
}

export async function fetchProfile(): Promise<Profile> {
  const response = await apiFetch<ProfileResponse>('/profile');
  return mapProfileResponse(response);
}

export async function updateProfile(profile: Profile): Promise<Profile> {
  const response = await apiFetch<ProfileResponse>('/profile', {
    method: 'PUT',
    body: JSON.stringify({
      nickname: profile.nickname || null,
      partner_name: profile.partnerName || null,
      partner_country: profile.partnerCountry || null,
      partner_job: profile.partnerJob || null,
      language: profile.language || null,
    }),
  });
  return {
    ...mapProfileResponse(response),
    photoUri: profile.photoUri,
  };
}
