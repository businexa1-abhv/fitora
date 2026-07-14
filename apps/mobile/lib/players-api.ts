import { apiFetch } from './api';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';

export interface PlayerProfile {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  city: string | null;
  skillLevel: SkillLevel | null;
  locationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  onboardingComplete: boolean;
  favoriteSports: Array<{
    id: string;
    name: string;
    slug: string;
    iconUrl: string | null;
    skillLevel: SkillLevel | null;
  }>;
}

export interface SportItem {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string | null;
}

export function getPlayerProfile(token: string) {
  return apiFetch<PlayerProfile>('/players/profile', {}, token);
}

export function upsertPlayerProfile(
  token: string,
  payload: {
    firstName: string;
    lastName: string;
    gender?: Gender;
    dateOfBirth?: string;
    city: string;
    avatarUrl?: string;
    skillLevel?: SkillLevel;
    favoriteSportIds?: string[];
    agreeTerms: boolean;
    latitude?: number;
    longitude?: number;
    locationLabel?: string;
  },
) {
  return apiFetch<PlayerProfile>('/players/profile', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export function updateFavoriteSports(
  token: string,
  sportIds: string[],
  skillLevel?: SkillLevel,
) {
  return apiFetch<PlayerProfile>(
    '/players/profile/sports',
    {
      method: 'PUT',
      body: JSON.stringify({ sportIds, skillLevel }),
    },
    token,
  );
}

export function setNotificationsOptIn(token: string, enabled: boolean) {
  return apiFetch<{ success: boolean; enabled: boolean }>(
    '/players/profile/notifications',
    {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    },
    token,
  );
}

export function getSports() {
  return apiFetch<SportItem[]>('/sports');
}
