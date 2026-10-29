import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// The app is laid out for a phone held upright. Wider screens (tablets,
// browsers, a phone turned sideways) get a 9:16 column in the middle, with
// dark margins at the sides. Only the width is limited: a phone taller than
// 9:16 uses all of its height.
const MAX_WIDTH_TO_HEIGHT = 9 / 16;
const MARGIN_COLOR = '#05070a';

export interface FrameDimensions {
  width: number;
  height: number;
}

const FrameContext = createContext<FrameDimensions | null>(null);

// Holds the whole app. Everything is laid out within it, so screens measure
// themselves with useFrameDimensions() — never by the window.
export function AppFrame({ children }: PropsWithChildren) {
  const window = useWindowDimensions();
  const frame = useMemo(
    () => ({
      width: Math.min(window.width, Math.round(window.height * MAX_WIDTH_TO_HEIGHT)),
      height: window.height,
    }),
    [window.width, window.height],
  );

  return (
    <View style={styles.margins}>
      <View style={[styles.frame, frame]}>
        <FrameContext.Provider value={frame}>
          {/* Inside the frame, so safe area insets are the frame's own. */}
          <SafeAreaProvider>{children}</SafeAreaProvider>
        </FrameContext.Provider>
      </View>
    </View>
  );
}

// The size of the app's frame: what useWindowDimensions() is to an app
// spanning the whole window.
export function useFrameDimensions(): FrameDimensions {
  const frame = useContext(FrameContext);
  if (!frame) {
    throw new Error('useFrameDimensions() must be used within AppFrame');
  }
  return frame;
}

const styles = StyleSheet.create({
  margins: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: MARGIN_COLOR,
  },
  frame: {
    overflow: 'hidden',
    // Sets the column off the margins where there are any (web, tablets).
    ...(Platform.OS === 'web' && { boxShadow: '0 0 40px rgba(0,0,0,0.6)' }),
  },
});
