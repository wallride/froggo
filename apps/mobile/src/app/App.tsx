import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { initializeAds } from '../ads/penaltyAd';
import { PlayerProvider } from '../identity/player-context';
import { AppFrame } from '../layout/app-frame';
import { StartupProgressProvider } from '../startup/startup-progress';
import { StartupScreen } from '../startup/StartupScreen';
import { AppProviders } from './providers/AppProviders';
import { ConfigurationGate } from './ConfigurationGate';
import { FontsGate } from './FontsGate';
import { PlayerGate } from './PlayerGate';
import { Navigation } from './Navigation';

export default function App() {
  useEffect(() => {
    initializeAds();
  }, []);

  // The startup screen lies over the app while it starts, so the app's
  // first screen is built underneath and shown complete. All of it within
  // the frame that keeps the app phone-shaped on wide screens.
  return (
    <AppFrame>
      <StartupProgressProvider>
        <View style={styles.root}>
          <FontsGate>
            <AppProviders>
              <ConfigurationGate>
                <PlayerProvider>
                  <PlayerGate>
                    <Navigation />
                  </PlayerGate>
                </PlayerProvider>
              </ConfigurationGate>
            </AppProviders>
          </FontsGate>
          <StartupScreen />
        </View>
      </StartupProgressProvider>
    </AppFrame>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
