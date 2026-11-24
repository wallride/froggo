// The device's UI language, as a lowercase code ("en", "ru") — a key of the
// texts that are bundled with the app. Those are needed before the server's
// configuration (which brings the app's own texts) is loaded, and when it
// can't be loaded at all.
export function getDeviceLanguage(): string {
  try {
    // Required lazily: on a native build made before expo-localization was
    // added, importing it would throw at startup instead of here.
    const Localization: typeof import('expo-localization') = require('expo-localization');
    return Localization.getLocales()[0]?.languageCode ?? 'en';
  } catch {
    return 'en';
  }
}
