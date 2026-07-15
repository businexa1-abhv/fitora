/** FitOra Owner — Stitch design tokens (Corporate Modernism / Indigo + Emerald) */
export const Colors = {
  light: {
    background: '#f9f9ff',
    foreground: '#111c2d',
    card: '#ffffff',
    border: '#c7c5d4',
    muted: '#464652',
    mutedBg: '#f0f3ff',
    surfaceContainer: '#e7eeff',
    primary: '#15157d',
    primaryContainer: '#2e3192',
    primaryForeground: '#ffffff',
    accent: '#2e3192',
    secondary: '#006c49',
    secondaryContainer: '#6cf8bb',
    tertiary: '#5a3700',
    tertiaryContainer: '#ffb95f',
    danger: '#ba1a1a',
    warning: '#f59e0b',
    tabBar: '#15157d',
    tabBarInactive: '#9da1ff',
    success: '#006c49',
  },
} as const;

export type ThemeColors = (typeof Colors)['light'];

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 24,
  full: 999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  hero: 28,
} as const;
