import { useEffect, useMemo, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@dead-lines-inc/frontend';

import { pickCellTextures } from '../assets/cellTextures';
import { usePlayer } from '../identity/player-context';
import { Screen } from '../layout/Screen';
import { screenBackgrounds } from '../layout/screen-backgrounds';
import { useConfiguration } from '../configuration/configuration-context';
import { pickText, useTexts } from '../localization/texts';
import { BoardFrame } from '../screens/PlayBoard/BoardFrame';
import { BoardGrid } from '../screens/PlayBoard/BoardGrid';
import { BOARD_HORIZONTAL_SPACING, CELL_SPACING, useBoardLayout } from '../screens/PlayBoard/boardLayout';
import { OnboardingButton } from './OnboardingButton';
import { TapIndicator } from './tutorial/TapIndicator';
import { TUTORIAL_BOARD } from './tutorial/tutorial-board';
import { TUTORIAL_STEPS } from './tutorial/tutorial-script';
import { useTutorialPlayback } from './tutorial/useTutorialPlayback';

interface TutorialScreenProps {
  // Back to the invitation (Android back button, on the first step).
  onBack: () => void;
}

// Shows how the game is played, step by step: each step plays a bit of a game
// on a training board, with a word of explanation, until the player goes on.
// After the last step the player is marked as onboarded (registered first) —
// and PlayerGate lets them into the app.
export function TutorialScreen({ onBack }: TutorialScreenProps) {
  const { completeOnboarding } = usePlayer();
  const texts = useTexts('onboarding').tutorial;
  const errorTexts = useTexts('errors');
  const [stepIndex, setStepIndex] = useState(0);
  // The next button says something else every time it's pressed.
  const nextText = useConfiguration().texts.onboarding.tutorial.next;
  const [nextTitle, setNextTitle] = useState(() => pickText(nextText));
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const layout = useBoardLayout(TUTORIAL_BOARD.size);
  const cellTextures = useMemo(() => pickCellTextures(TUTORIAL_BOARD.cells), []);
  const { cells, tap } = useTutorialPlayback(TUTORIAL_BOARD, TUTORIAL_STEPS, stepIndex);

  const step = TUTORIAL_STEPS[stepIndex];
  const isLastStep = stepIndex === TUTORIAL_STEPS.length - 1;

  // Back goes a step back, and from the first one to the invitation.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stepIndex > 0) setStepIndex(stepIndex - 1);
      else onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack, stepIndex]);

  const finish = async () => {
    setPending(true);
    setFailed(false);
    try {
      // Unmounts the onboarding on success.
      await completeOnboarding();
    } catch {
      setFailed(true);
      setPending(false);
    }
  };

  const cellFootprint = layout.cellSize + CELL_SPACING;

  return (
    <Screen background={screenBackgrounds.playBoard} style={styles.container}>
      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>{texts.steps[step.id] ?? ''}</Text>
      </View>

      <BoardFrame layout={layout}>
        {/* The taps are shown over the grid, in its coordinates. */}
        <View>
          <BoardGrid
            size={TUTORIAL_BOARD.size}
            cells={cells}
            cellTextures={cellTextures}
            cellSize={layout.cellSize}
            cellBorderRadius={layout.cellBorderRadius}
          />
          {tap && (
            <TapIndicator
              key={tap.id}
              x={((tap.index % TUTORIAL_BOARD.size) + 0.5) * cellFootprint}
              y={(Math.floor(tap.index / TUTORIAL_BOARD.size) + 0.5) * cellFootprint}
              size={layout.cellSize * 0.9}
              double={tap.double}
            />
          )}
        </View>
      </BoardFrame>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {TUTORIAL_STEPS.map((tutorialStep, index) => (
            <View
              key={tutorialStep.id}
              style={[styles.dot, index === stepIndex && styles.dotCurrent]}
            />
          ))}
        </View>
        {failed && <Text style={styles.error}>{errorTexts.registerPlayer}</Text>}
        {isLastStep ? (
          <OnboardingButton title={texts.finish} onPress={finish} pending={pending} />
        ) : (
          <OnboardingButton
            variant="outline"
            title={nextTitle}
            onPress={() => {
              setStepIndex(stepIndex + 1);
              setNextTitle((previous) => pickText(nextText, previous));
            }}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BOARD_HORIZONTAL_SPACING,
    paddingVertical: 20,
  },
  instructions: {
    alignSelf: 'stretch',
    minHeight: 96,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(10,12,20,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,205,120,0.35)',
  },
  instructionsText: {
    fontFamily: fonts.regular,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  footer: {
    alignSelf: 'stretch',
    gap: 14,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotCurrent: {
    backgroundColor: colors.accentQuota,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#ff6b6b',
  },
});
