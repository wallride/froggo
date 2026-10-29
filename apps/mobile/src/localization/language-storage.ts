import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const LANGUAGE_KEY = 'deadLinesInc.language';

// The language the player picked in Settings, kept across launches. Same
// storage split as device-id.ts: expo-secure-store has no web implementation,
// so web falls back to localStorage. Storage failing (blocked, full) only
// costs the preference, never the app, hence the swallowed errors.
export async function getStoredLanguage(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(LANGUAGE_KEY);
    }
    return await SecureStore.getItemAsync(LANGUAGE_KEY);
  } catch {
    return null;
  }
}

export async function storeLanguage(code: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(LANGUAGE_KEY, code);
      return;
    }
    await SecureStore.setItemAsync(LANGUAGE_KEY, code);
  } catch {
    // Not persisted; the choice still applies until the app is closed.
  }
}
