
// Dance with Lorenzo Tokyo - Vibrant Tahitian Sunset Theme
export const colors = {
  // Primary Tahitian Sunset Palette - Enhanced Vibrancy
  primary: '#0F4C81',      // Rich Tropical Ocean Blue
  primaryDark: '#0A3A5E',  // Deep Pacific Blue
  primaryLight: '#1E88E5', // Bright Sky Blue
  accent: '#FF6B35',       // Vibrant Sunset Coral
  accentLight: '#FF9E7A',  // Soft Peachy Coral
  accentDark: '#E84A1F',   // Deep Sunset Orange
  
  // Backgrounds - Modern & Clean
  background: '#FAFAFA',   // Contemporary Light Gray
  surface: '#FFFFFF',
  surfaceWarm: '#FFFBF5',  // Ultra Soft Peach
  surfaceDark: '#1a1a1a',
  
  // Glass Effects (Modern)
  glassBackground: 'rgba(255, 255, 255, 0.7)',
  glassBorder: 'rgba(255, 107, 53, 0.2)',
  
  // Text - Enhanced Contrast
  text: '#2C3E50',         // Deep Charcoal Blue
  textLight: '#64748B',    // Slate Gray
  textInverse: '#FFFFFF',
  
  // Status - Vibrant & Clear
  success: '#06D6A0',      // Tropical Teal
  warning: '#FFB800',      // Golden Amber
  error: '#FF5757',        // Coral Red
  
  // Token System - Eye-catching
  tokenActive: '#FF6B35',  // Vibrant Coral (matches accent)
  tokenInactive: '#E2DED8', // Warm Stone
  
  // Gradient Colors - Stunning Sunset
  gradientStart: '#0F4C81', // Rich Ocean Blue
  gradientMid: '#FF6B35',   // Sunset Coral
  gradientEnd: '#FFA07A',   // Light Salmon
  
  // Additional Accent Colors
  tropicalPink: '#FF6B9D',  // Hibiscus Pink
  tropicalGold: '#FFD700',  // Golden Sand
  
  // Border
  border: '#E2E8F0',            // Light border
  borderDark: '#CBD5E1',        // Darker border

  // Shadows
  shadow: 'rgba(15, 76, 129, 0.15)',
  shadowDark: 'rgba(15, 76, 129, 0.35)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 26,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
};
