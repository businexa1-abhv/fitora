import { SportType } from '@fitora/shared';

export const SPORT_EMOJI: Record<SportType, string> = {
  [SportType.BADMINTON]: '🏸',
  [SportType.TENNIS]: '🎾',
  [SportType.CRICKET]: '🏏',
  [SportType.FOOTBALL]: '⚽',
  [SportType.SWIMMING]: '🏊',
  [SportType.GYM]: '💪',
  [SportType.OTHER]: '🏟️',
};

export const SPORT_COLORS: Record<SportType, string> = {
  [SportType.BADMINTON]: '#00b564',
  [SportType.TENNIS]: '#84cc16',
  [SportType.CRICKET]: '#0ea5e9',
  [SportType.FOOTBALL]: '#16a34a',
  [SportType.SWIMMING]: '#06b6d4',
  [SportType.GYM]: '#8b5cf6',
  [SportType.OTHER]: '#64748b',
};

export const POPULAR_SPORTS = [
  SportType.BADMINTON,
  SportType.FOOTBALL,
  SportType.CRICKET,
  SportType.TENNIS,
  SportType.SWIMMING,
  SportType.GYM,
];

export const CITIES = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kochi'];
