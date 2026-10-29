import { PropsWithChildren, ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';

import { colors } from '@dead-lines-inc/frontend';

import { backgroundFade } from '../components/backgroundFade';
import { useFrameDimensions } from './app-frame';
import type { ScreenBackground } from './screen-backgrounds';

const ALL_EDGES: Edge[] = ['top', 'right', 'bottom', 'left'];
// For a screen under a navigation header, which keeps the top clear itself.
export const UNDER_HEADER: Edge[] = ['right', 'bottom', 'left'];

interface ScreenProps {
  // Art behind the screen; a plain colors.background without it.
  background?: ScreenBackground;
  // Edges kept clear of the notch, the home indicator, etc. All by default;
  // a screen under a navigation header leaves the top to it. False for a
  // screen that places everything itself.
  safeArea?: Edge[] | false;
  // The content's own style (padding, alignment, ...), inside the safe area.
  style?: StyleProp<ViewStyle>;
  // Laid over the whole screen, safe area included — popups and the like.
  overlay?: ReactNode;
}

// The base of every screen: its background, sized to the app's frame, and
// its content kept within the safe area.
export function Screen({
  background,
  safeArea = ALL_EDGES,
  style,
  overlay,
  children,
}: PropsWithChildren<ScreenProps>) {
  const content = <View style={[styles.content, style]}>{children}</View>;

  return (
    <View style={[styles.screen, { backgroundColor: background?.color ?? colors.background }]}>
      {background && <BackgroundArt background={background} />}
      {safeArea ? (
        <SafeAreaView style={styles.content} edges={safeArea}>
          {content}
        </SafeAreaView>
      ) : (
        content
      )}
      {overlay}
    </View>
  );
}

// Sized explicitly rather than stretched — an Image without its own
// width/height doesn't reliably fill its container on the web target.
function BackgroundArt({ background }: { background: ScreenBackground }) {
  const frame = useFrameDimensions();

  if (background.aspect === undefined) {
    return (
      <Image
        source={background.source}
        style={[styles.art, { width: frame.width, height: frame.height }]}
        resizeMode="cover"
      />
    );
  }

  const height = frame.width * background.aspect;
  const fade = background.fade ?? 0;
  return (
    <>
      <Image
        source={background.source}
        style={[styles.art, { width: frame.width, height }]}
        resizeMode="cover"
      />
      {fade > 0 && (
        <View
          style={[
            styles.fade,
            { top: height * (1 - fade), height: height * fade },
            backgroundFade(background.color),
          ]}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  art: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
