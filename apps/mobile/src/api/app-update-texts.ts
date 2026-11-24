import { getDeviceLanguage } from '../localization/device-language';

// Bundled: the update alert can be what a start ends with, before the
// server's texts are loaded (and the configuration request is one of those the
// server refuses). In the device's language, English otherwise.
const UPDATE_TEXTS = {
  en: {
    message: 'The app must be updated. Please go to your app store.',
    button: 'Update',
  },
  ru: {
    message: 'Мобильное приложение необходимо обновить. Перейдите в свой магазин приложений',
    button: 'Обновить',
  },
} satisfies Record<string, { message: string; button: string }>;

export const appUpdateTexts =
  UPDATE_TEXTS[getDeviceLanguage() as keyof typeof UPDATE_TEXTS] ?? UPDATE_TEXTS.en;
