// Texts shown before the configuration (which brings the app's texts) is
// loaded, so they're bundled — in the device's language, English otherwise.
import { getDeviceLanguage } from '../localization/device-language';

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

export const startupTexts =
  STARTUP_TEXTS[getDeviceLanguage() as keyof typeof STARTUP_TEXTS] ?? STARTUP_TEXTS.en;
