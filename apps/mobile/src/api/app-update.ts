import { Alert, AppState, AppStateStatus, BackHandler, Linking, Platform } from 'react-native';

import { APP_STORE_URL } from './app-store-url';
import { appUpdateTexts } from './app-update-texts';

// The server has refused this app version (426 Upgrade Required): the app
// can't be used until it's updated. The alert has a single button — no way
// back into the app — and is raised again whenever the app is brought back
// from the store, in case it's still the old version.
let updateRequired = false;
let alertVisible = false;

export function requireAppUpdate(): void {
  if (updateRequired) return;
  updateRequired = true;
  AppState.addEventListener('change', handleAppStateChange);
  showAlert();
}

function handleAppStateChange(state: AppStateStatus): void {
  if (state === 'active') showAlert();
}

function showAlert(): void {
  if (alertVisible) return;
  alertVisible = true;
  Alert.alert(
    appUpdateTexts.message,
    undefined,
    [{ text: appUpdateTexts.button, onPress: openStore }],
    // Android: the back button and a tap outside must not dismiss it either.
    { cancelable: false },
  );
}

async function openStore(): Promise<void> {
  alertVisible = false;
  try {
    await Linking.openURL(APP_STORE_URL);
  } catch {
    // No store to open: the alert still blocks the outdated app.
  } finally {
    // The app must be restarted after updating. Android can be closed
    // outright; iOS has no API for that, so the app goes to the background
    // and the alert is shown again when it's reopened.
    if (Platform.OS === 'android') BackHandler.exitApp();
  }
}
