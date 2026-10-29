import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { isLoaded } from 'expo-font';

import { colors, fonts } from '@dead-lines-inc/frontend';

import { Screen } from '../layout/Screen';
import { screenBackgrounds } from '../layout/screen-backgrounds';
import { OnboardingButton } from '../onboarding/OnboardingButton';
import { useStartupProgress } from './startup-progress';
import { startupTexts } from './startup-texts';

const PROGRESS_ANIMATION_MS = 250;
const FADE_OUT_MS = 300;

// Covers the app while it starts — fonts, images, the configuration, the
// player, the home screen's data — with one progress bar over all of it.
// Fades out once everything is there, revealing the first screen ready.
export function StartupScreen() {
  const { progress, done, error, retry } = useStartupProgress();
  const shownProgress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    Animated.timing(shownProgress, {
      toValue: progress,
      duration: PROGRESS_ANIMATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progress, shownProgress]);

  useEffect(() => {
    if (!done) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      // Lets the bar visibly reach its end first.
      delay: PROGRESS_ANIMATION_MS,
      useNativeDriver: true,
    }).start(() => setHidden(true));
  }, [done, opacity]);

  if (hidden) return null;

  return (
    <Animated.View style={[styles.container, { opacity, pointerEvents: done ? 'none' : 'auto' }]}>
      <Screen background={screenBackgrounds.invitation} style={styles.content}>
        {/* The system font stands in until the custom one is loaded (it's
            re-rendered then: the fonts are a stage of the progress). */}
        <Text style={[styles.label, isLoaded(fonts.headingBold) && styles.labelFont]}>
          {startupTexts.loading}
        </Text>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              {
                width: shownProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        {error && (
          <>
            <Text style={styles.error}>{error}</Text>
            <View style={styles.retry}>
              <OnboardingButton title={startupTexts.retry} onPress={retry} />
            </View>
          </>
        )}
      </Screen>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 14,
  },
  label: {
    fontSize: 22,
    letterSpacing: 1,
    marginTop: 150,
    color: colors.textPrimary,
  },
  labelFont: {
    fontFamily: fonts.headingBold,
  },
  track: {
    width: '100%',
    maxWidth: 320,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.accentQuota,
  },
  retry: {
    width: '100%',
    maxWidth: 320,
    marginTop: 10,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlign: 'center',
    color: '#ff6b6b',
  },
});
