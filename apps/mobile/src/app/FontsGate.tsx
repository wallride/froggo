import { PropsWithChildren } from 'react';
import { useFonts } from 'expo-font';

import { fontAssets } from '../assets/fonts';
import { useStartupStage } from '../startup/startup-progress';

// Holds the app back until the custom fonts are loaded, so text doesn't
// first render in the system font. A failed load falls back to it. The
// startup screen is shown meanwhile.
export function FontsGate({ children }: PropsWithChildren) {
  const [loaded, error] = useFonts(fontAssets);
  const ready = loaded || !!error;
  useStartupStage('fonts', ready);

  return ready ? children : null;
}
