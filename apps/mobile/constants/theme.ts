export const Colors = {
  light: {
    background: '#f8f6f4',
    foreground: '#1a1410',
    card: '#ffffff',
    border: '#ebe4e0',
    muted: '#6b5f56',
    mutedBg: '#f0ebe8',
    primary: '#ff6b35',
    primaryDark: '#e55520',
    primaryLight: '#fff1eb',
    primaryForeground: '#ffffff',
    accent: '#f59e0b',
    danger: '#ef4444',
    warning: '#f59e0b',
    tabBar: '#ffffff',
    tabBarBorder: '#ebe4e0',
    heroFrom: '#ff6b35',
    heroTo: '#d94e1f',
    shadow: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    background: '#120e0c',
    foreground: '#fdf6f0',
    card: '#1a1512',
    border: '#2e241f',
    muted: '#a89890',
    mutedBg: '#2a1f1a',
    primary: '#ff8a5c',
    primaryDark: '#ff6b35',
    primaryLight: '#2a1810',
    primaryForeground: '#120e0c',
    accent: '#fbbf24',
    danger: '#f87171',
    warning: '#fbbf24',
    tabBar: '#15110e',
    tabBarBorder: '#2e241f',
    heroFrom: '#ff6b35',
    heroTo: '#c2410c',
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
