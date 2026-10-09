export const colors = {
  primary: '#11A559',
  primaryLight: '#22C55E',
  primaryDark: '#15803D',
  primarySoft: '#F0FDF4',

  secondary: '#1B3A4B',
  secondaryLight: '#264F65',

  accent: '#F0A500',
  accentSoft: '#FFF8E7',
  accentDark: '#C68800',

  surface: '#FFFFFF',
  surfaceAlt: '#F7FAF9',
  background: '#F2F6F5',

  textPrimary: '#1A2B2E',
  textSecondary: '#5C7A7E',
  textTertiary: '#94A8AB',
  textInverse: '#FFFFFF',

  success: '#2E7D32',
  successSoft: '#E8F5E9',
  warning: '#ED6C02',
  warningSoft: '#FFF3E0',
  error: '#D32F2F',
  errorSoft: '#FFEBEE',
  info: '#0288D1',
  infoSoft: '#E1F5FE',

  border: '#E0EAE8',
  borderActive: '#0A6B5C',
  divider: '#EEF2F1',

  skeleton: '#E8EDEC',
  skeletonHighlight: '#F2F6F5',

  overlay: 'rgba(26, 43, 46, 0.5)',
  shadow: 'rgba(17, 165, 89, 0.08)',
  shadowDark: 'rgba(17, 165, 89, 0.16)',
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
