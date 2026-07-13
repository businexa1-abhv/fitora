import { SportType } from '@fitora/shared';

export const SPORT_GRADIENTS: Record<SportType, string> = {
  [SportType.BADMINTON]: 'from-emerald-500 to-teal-600',
  [SportType.TENNIS]: 'from-lime-500 to-green-600',
  [SportType.CRICKET]: 'from-sky-500 to-blue-600',
  [SportType.FOOTBALL]: 'from-green-600 to-emerald-800',
  [SportType.SWIMMING]: 'from-cyan-500 to-blue-600',
  [SportType.GYM]: 'from-violet-500 to-purple-700',
  [SportType.OTHER]: 'from-slate-500 to-slate-700',
};

export const SPORT_EMOJI: Record<SportType, string> = {
  [SportType.BADMINTON]: '🏸',
  [SportType.TENNIS]: '🎾',
  [SportType.CRICKET]: '🏏',
  [SportType.FOOTBALL]: '⚽',
  [SportType.SWIMMING]: '🏊',
  [SportType.GYM]: '💪',
  [SportType.OTHER]: '🏟️',
};

export const POPULAR_SPORTS = [
  SportType.BADMINTON,
  SportType.FOOTBALL,
  SportType.CRICKET,
  SportType.TENNIS,
  SportType.SWIMMING,
  SportType.GYM,
];

export { INDIAN_CITIES, POPULAR_CITIES } from './indian-cities';

/** @deprecated Prefer POPULAR_CITIES or INDIAN_CITIES */
export const CITIES = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kochi'];
