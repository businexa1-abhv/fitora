export const Colors = {
  light: {
    background: '#f8f9fa',
    foreground: '#191c1d',
    card: '#ffffff',
    border: '#e2bfb0',
    muted: '#555f6f',
    mutedBg: '#edeeef',
    primary: '#a04100',
    primaryDark: '#7a3000',
    primaryLight: '#ffdbcc',
    primaryForeground: '#ffffff',
    accent: '#ff6b00',
    danger: '#ef4444',
    warning: '#ffdb17',
    tabBar: '#ffffff',
    tabBarBorder: '#e2bfb0',
    heroFrom: '#ff6b00',
    heroTo: '#a04100',
    shadow: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    background: '#171a26',
    foreground: '#f0f1f2',
    card: '#2e3132',
    border: '#5a4136',
    muted: '#bdc7d9',
    mutedBg: '#242733',
    primary: '#ffb693',
    primaryDark: '#ff8b54',
    primaryLight: '#351000',
    primaryForeground: '#171a26',
    accent: '#ff6b00',
    danger: '#f87171',
    warning: '#ffdb17',
    tabBar: '#171a26',
    tabBarBorder: '#5a4136',
    heroFrom: '#ff6b00',
    heroTo: '#351000',
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
