import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@dead-lines-inc/frontend';

import { useFrameDimensions } from '../layout/app-frame';
import { Screen } from '../layout/Screen';
import { screenBackgrounds } from '../layout/screen-backgrounds';
import { useTexts } from '../localization/texts';
import { OnboardingButton } from './OnboardingButton';

// Death's bubble with the button under it: a column this share of the screen
// width, centered, starting at this share of the screen height.
const PANEL_WIDTH_RATIO = 0.8;
const PANEL_TOP_RATIO = 0.45;
// Where the bubble's tail points up at Death's hand in the art, as a share
// of the screen width (the art is scaled to the width, so it stays on it).
const TAIL_X_RATIO = 0.4;
const TAIL_WIDTH = 20;
const TAIL_HEIGHT = 14;

interface InvitationScreenProps {
  onTryIt: () => void;
}

// The first thing a new user sees: a welcome over the background art and the
// way on to the tutorial.
export function InvitationScreen({ onTryIt }: InvitationScreenProps) {
  const texts = useTexts('onboarding').invitation;
  const frame = useFrameDimensions();
  const panelWidth = frame.width * PANEL_WIDTH_RATIO;
  const panelLeft = (frame.width - panelWidth) / 2;
  const tailLeft = frame.width * TAIL_X_RATIO - panelLeft - TAIL_WIDTH / 2;

  return (
    <Screen background={screenBackgrounds.invitation} safeArea={false}>
      <View
        style={[
          styles.panel,
          { top: frame.height * PANEL_TOP_RATIO, left: panelLeft, width: panelWidth },
        ]}
      >
        <View style={styles.bubble}>
          <View style={[styles.bubbleTail, { left: tailLeft }]} />
          <Text style={styles.welcome}>{texts.welcome}</Text>
          <Text style={styles.message}>{texts.message}</Text>
          <Text style={styles.signature}>{texts.signature}</Text>
        </View>
        <OnboardingButton title={texts.getStarted} onPress={onTryIt} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    gap: 16,
  },
  bubble: {
    backgroundColor: colors.bubbleBackground,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  // A triangle pointing up, drawn with borders.
  bubbleTail: {
    position: 'absolute',
    top: -TAIL_HEIGHT,
    width: 0,
    height: 0,
    borderLeftWidth: TAIL_WIDTH / 2,
    borderRightWidth: TAIL_WIDTH / 2,
    borderBottomWidth: TAIL_HEIGHT,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.bubbleBackground,
  },
  welcome: {
    fontFamily: fonts.bold,
    fontSize: 29,
    lineHeight: 31,
    color: colors.bubbleText,
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: 21,
    lineHeight: 23,
    paddingVertical: 10,
    color: colors.bubbleText,
  },
  signature: {
    fontFamily: fonts.medium,
    textAlign: 'right',
    fontSize: 21,
    textTransform: 'uppercase',
    color: colors.bubbleTextMuted,
  },
});
