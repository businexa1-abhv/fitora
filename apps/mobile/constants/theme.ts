export const Colors = {
  light: {
    background: '#f4f6f8',
    foreground: '#0d1f17',
    card: '#ffffff',
    border: '#e4ebe7',
    muted: '#5c6b64',
    mutedBg: '#eef2ef',
    primary: '#00b564',
    primaryDark: '#009652',
    primaryLight: '#e8faf1',
    primaryForeground: '#ffffff',
    accent: '#ff6b35',
    danger: '#ef4444',
    warning: '#f59e0b',
    tabBar: '#ffffff',
    tabBarBorder: '#e4ebe7',
    heroFrom: '#00b564',
    heroTo: '#00875a',
    shadow: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    background: '#0a1210',
    foreground: '#f0f4f2',
    card: '#141f1a',
    border: '#1e2e26',
    muted: '#8a9a92',
    mutedBg: '#1a2620',
    primary: '#00d676',
    primaryDark: '#00b564',
    primaryLight: '#0d2818',
    primaryForeground: '#0a1210',
    accent: '#ff8a5c',
    danger: '#f87171',
    warning: '#fbbf24',
    tabBar: '#0f1814',
    tabBarBorder: '#1e2e26',
    heroFrom: '#00b564',
    heroTo: '#006b45',
    shadow: 'rgba(0, 0, 0, 0.4)',
  },
} as const;

export type ThemeColors = (typeof Colors)[ColorScheme];
export type ColorScheme = 'light' | 'dark';

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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  hero: 28,
} as const;
