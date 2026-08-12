import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'froggo.deviceId';

// expo-secure-store has no web implementation, so fall back to localStorage
// there. It's a non-sensitive anonymous ID either way.
async function getStoredDeviceId(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(DEVICE_ID_KEY);
  }
  return SecureStore.getItemAsync(DEVICE_ID_KEY);
}

async function storeDeviceId(id: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(DEVICE_ID_KEY, id);
    return;
  }
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
}

// Stable per-device anonymous identity. Note this lives in the OS
// keychain/keystore, so it won't survive an uninstall on Android (iOS
// Keychain items often do). Good enough to identify a player across app
// launches; linking a real account (e.g. Google) is what survives reinstalls.
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getStoredDeviceId();
  if (existing) return existing;

  const created = Crypto.randomUUID();
  await storeDeviceId(created);
  return created;
}
