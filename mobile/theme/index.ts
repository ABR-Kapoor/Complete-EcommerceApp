export const colors = {
  primary: '#176B50', // Primary emerald
  primaryLight: '#238C6B',
  primaryDark: '#124638', // Deep forest
  primarySoft: '#E8F3EC', // Soft mint

  secondary: '#124638',
  secondaryLight: '#9DB8A5', // Sage

  accent: '#F0A500',
  accentSoft: '#FFF8E7',
  accentDark: '#C68800',

  surface: '#FFFFFF',
  surfaceAlt: '#F8FAF7', // Warm background / surface
  background: '#F8FAF7',

  textPrimary: '#1C3028', // Main text
  textSecondary: '#68776F', // Secondary text
  textTertiary: '#9DB8A5',
  textInverse: '#FFFFFF',

  success: '#176B50',
  successSoft: '#E8F3EC',
  warning: '#ED6C02',
  warningSoft: '#FFF3E0',
  error: '#D32F2F',
  errorSoft: '#FFEBEE',
  info: '#0288D1',
  infoSoft: '#E1F5FE',

  border: '#E3EAE4', // Border token
  borderActive: '#176B50',
  divider: '#E3EAE4',

  skeleton: '#E8EDEC',
  skeletonHighlight: '#F8FAF7',

  overlay: 'rgba(28, 48, 40, 0.5)',
  shadow: 'rgba(23, 107, 80, 0.08)',
  shadowDark: 'rgba(23, 107, 80, 0.16)',
};

export const fonts = {
  heading: 'Outfit_600SemiBold',
  headingBold: 'Outfit_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_600SemiBold',
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 34,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
};
