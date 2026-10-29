import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { challenges } from '@dead-lines-inc/common.models';
import { colors, fonts } from '@dead-lines-inc/frontend';

import { pillStyles } from './pillStyle';
import { PlayStatusRow } from './PlayStatusRow';
import type { GameState } from './types';

interface AccuracyPlayStatusRowProps {
  foundTargets: number;
  boardSize: number;
  challenge?: challenges.Challenge;
  // As it stood before this play (fresh from startPlay).
  challengeParticipation?: challenges.ChallengeParticipation;
  gameState: GameState;
}

// Status row of an accuracy play: the challenge's progress — boards won so
// far, and boards not played yet (this one included until it's over).
export function AccuracyPlayStatusRow({
  foundTargets,
  boardSize,
  challenge,
  challengeParticipation,
  gameState,
}: AccuracyPlayStatusRowProps) {
  const isOver = gameState !== 'playing';
  const won = (challengeParticipation?.boardsWon ?? 0) + (gameState === 'won' ? 1 : 0);
  const remaining = Math.max(
    0,
    (challenge?.boardIds.length ?? 0) -
      (challengeParticipation?.boardsPlayed ?? 0) -
      (isOver ? 1 : 0),
  );

  return (
    <PlayStatusRow foundTargets={foundTargets} boardSize={boardSize}>
      {challenge && (
        <View style={pillStyles.pill}>
          <Ionicons name="trophy-outline" size={21} color={colors.textMuted} />
          <Text style={styles.value}>{won}</Text>
          <Ionicons name="albums-outline" size={21} color={colors.textMuted} style={styles.gap} />
          <Text style={styles.value}>{remaining}</Text>
        </View>
      )}
    </PlayStatusRow>
  );
}

const styles = StyleSheet.create({
  value: {
    fontFamily: fonts.regular,
    fontSize: 21,
    color: colors.accentAccuracy,
    fontVariant: ['tabular-nums'],
  },
  gap: {
    marginLeft: 8,
  },
});
