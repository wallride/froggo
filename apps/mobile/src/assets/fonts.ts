import type { FontSource } from 'expo-font';
import { fonts } from '@dead-lines-inc/frontend';

// Font files keyed by the family names from the theme, for useFonts().
export const fontAssets: Record<(typeof fonts)[keyof typeof fonts], FontSource> = {
  [fonts.regular]: require('../../assets/fonts/Alegreya-Regular.ttf'),
  [fonts.medium]: require('../../assets/fonts/Alegreya-Medium.ttf'),
  [fonts.semiBold]: require('../../assets/fonts/Alegreya-SemiBold.ttf'),
  [fonts.bold]: require('../../assets/fonts/Alegreya-Bold.ttf'),
  [fonts.headingMedium]: require('../../assets/fonts/AlegreyaSC-Medium.ttf'),
  [fonts.headingBold]: require('../../assets/fonts/AlegreyaSC-Bold.ttf'),
  [fonts.headingExtraBold]: require('../../assets/fonts/AlegreyaSC-ExtraBold.ttf'),
};
