import { Platform } from 'react-native';

// Where the "Update" button sends the player — the app's page in the store of
// the platform it runs on. Placeholders until the app is published: replace
// them with the real store pages (iOS app id, Android package name).
const STORE_URLS = {
  ios: 'https://apps.apple.com/app/id000000000',
  android: 'https://play.google.com/store/apps/details?id=com.deadlinesinc.mobile',
  // The web build isn't distributed through a store; this is its download page.
  web: 'https://example.com/dead-lines-inc/download',
} as const;

export const APP_STORE_URL =
  Platform.OS === 'ios'
    ? STORE_URLS.ios
    : Platform.OS === 'android'
      ? STORE_URLS.android
      : STORE_URLS.web;
