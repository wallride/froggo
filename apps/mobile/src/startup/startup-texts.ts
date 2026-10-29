// Texts shown before the configuration (which brings the app's texts) is
// loaded, so they're bundled — in the device's language, English otherwise.
const STARTUP_TEXTS = {
  en: {
    loading: 'Loading',
    configurationFailed: "Can't reach the server. Check your connection.",
    retry: 'Try again',
  },
  ru: {
    loading: 'Загрузка',
    configurationFailed: 'Не удаётся связаться с сервером. Проверьте подключение.',
    retry: 'Повторить',
  },
} satisfies Record<string, Record<string, string>>;

function getDeviceLanguage(): string {
  try {
    // Required lazily, same as in configuration-context.
    const Localization: typeof import('expo-localization') = require('expo-localization');
    return Localization.getLocales()[0]?.languageCode ?? 'en';
  } catch {
    return 'en';
  }
}

export const startupTexts =
  STARTUP_TEXTS[getDeviceLanguage() as keyof typeof STARTUP_TEXTS] ?? STARTUP_TEXTS.en;
