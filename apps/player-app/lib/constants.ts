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
  [SportType.BADMINTON]: '#ff6b00',
  [SportType.TENNIS]: '#a04100',
  [SportType.CRICKET]: '#0062a1',
  [SportType.FOOTBALL]: '#059eff',
  [SportType.SWIMMING]: '#00a7c7',
  [SportType.GYM]: '#ff3278',
  [SportType.OTHER]: '#555f6f',
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
