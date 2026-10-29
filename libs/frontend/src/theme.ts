export const colors = {
  background: '#10151a',
  surface: '#171f1c',
  surfaceBorder: '#263029',
  textPrimary: '#c7cdd9',
  textSecondary: '#8a9790',
  textMuted: '#6f7d76',
  accentQuota: '#3ddc84',
  accentRush: '#e0a52c',
  accentOvertime: '#8b7cf6',
  accentAccuracy: '#4fb3e8',
  bubbleBackground: '#efe6d8',
  bubbleText: '#4b4630',
  bubbleTextMuted: '#8a8070',
} as const;

// Font families, named after the font files the app registers them under.
// Custom fonts don't pick a face by fontWeight, so each weight is its own
// family — set fontFamily instead of fontWeight.
export const fonts = {
  // Body text and buttons.
  regular: 'Alegreya-Regular',
  medium: 'Alegreya-Medium',
  semiBold: 'Alegreya-SemiBold',
  bold: 'Alegreya-Bold',
  // Headings.
  headingMedium: 'AlegreyaSC-Medium',
  headingBold: 'AlegreyaSC-Bold',
  headingExtraBold: 'AlegreyaSC-ExtraBold',
} as const;
