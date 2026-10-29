import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Language, MobileConfiguration } from '@dead-lines-inc/common.models';

import { ConfigurationAPI } from '../api/configuration-api';
import { getStoredLanguage, storeLanguage } from '../localization/language-storage';

interface ConfigurationState {
  configuration: MobileConfiguration | null;
  loading: boolean;
  error: string | null;
}

interface ConfigurationContextValue extends ConfigurationState {
  changeLanguage: (code: string) => Promise<void>;
  // Loads the configuration anew after the start's load has failed.
  reload: () => void;
}

const INITIAL_STATE: ConfigurationState = {
  configuration: null,
  loading: true,
  error: null,
};

const ConfigurationContext = createContext<ConfigurationContextValue>({
  ...INITIAL_STATE,
  changeLanguage: () => Promise.reject(new Error('No ConfigurationProvider')),
  reload: () => undefined,
});

const configurationApi = new ConfigurationAPI();

// The device's preferred languages, most preferred first, as a
// comma-separated list of BCP 47 tags ("de-DE,ru-RU,en-US") — the server
// takes the first one it has texts for, otherwise English. The system list
// (iOS preferred languages, Android locale list, navigator.languages on web)
// comes from expo-localization; Intl is the fallback if that's unavailable.
function getDeviceLanguages(): string | undefined {
  const tags: string[] = [];
  try {
    // Required lazily: on a native build made before expo-localization was
    // added, importing it would throw at startup instead of here.
    const Localization: typeof import('expo-localization') = require('expo-localization');
    tags.push(...Localization.getLocales().map((locale) => locale.languageTag));
  } catch {
    // Native module missing; try Intl below.
  }
  try {
    tags.push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    // No Intl either.
  }
  const unique = [...new Set(tags.filter(Boolean))];
  return unique.length > 0 ? unique.join(',') : undefined;
}

// Loads the app configuration once at start, in the language the player
// picked in Settings, or else the device's system language. Everything that
// depends on it (player identification, API calls, texts) must render below
// ConfigurationGate.
export function ConfigurationProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<ConfigurationState>(INITIAL_STATE);
  // Bumped by reload() to run the load again.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const language = (await getStoredLanguage()) ?? getDeviceLanguages();
        const configuration = await configurationApi.getConfiguration({ language });
        if (!cancelled) setState({ configuration, loading: false, error: null });
      } catch (e) {
        if (!cancelled) {
          setState({
            configuration: null,
            loading: false,
            error: e instanceof Error ? e.message : 'Failed to load app configuration',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setState(INITIAL_STATE);
    setAttempt((current) => current + 1);
  }, []);

  // Reloads the configuration in another language and remembers the choice.
  // The current configuration stays in place until the new one has arrived —
  // and if it doesn't, stays for good and the error is left to the caller —
  // so the app never drops back to the loading screen mid-use.
  const changeLanguage = useCallback(async (code: string) => {
    const configuration = await configurationApi.getConfiguration({ language: code });
    await storeLanguage(configuration.language);
    setState((previous) => ({
      configuration: {
        ...configuration,
        // Keep the old reference while nothing in it changed, so API clients
        // built from it (and everything depending on them) aren't rebuilt by
        // a mere change of language.
        api:
          previous.configuration &&
          JSON.stringify(previous.configuration.api) === JSON.stringify(configuration.api)
            ? previous.configuration.api
            : configuration.api,
      },
      loading: false,
      error: null,
    }));
  }, []);

  const value = useMemo(
    () => ({ ...state, changeLanguage, reload }),
    [state, changeLanguage, reload],
  );

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  );
}

// Loading/error state, for the gate.
export function useConfigurationState(): ConfigurationState & Pick<ConfigurationContextValue, 'reload'> {
  return useContext(ConfigurationContext);
}

// The loaded configuration. Only valid below ConfigurationGate.
export function useConfiguration(): MobileConfiguration {
  const { configuration } = useContext(ConfigurationContext);
  if (!configuration) {
    throw new Error('useConfiguration() must be used below ConfigurationGate');
  }
  return configuration;
}

// The language in use, the ones on offer, and how to switch. Only valid below
// ConfigurationGate.
export function useLanguage(): {
  language: string;
  languages: Language[];
  changeLanguage: (code: string) => Promise<void>;
} {
  const { language, languages } = useConfiguration();
  const { changeLanguage } = useContext(ConfigurationContext);
  return { language, languages, changeLanguage };
}
