import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { JoinChallengeResponse } from '@dead-lines-inc/common.api.mobile';
import { challenges, PlayTypeEnum } from '@dead-lines-inc/common.models';
import { colors, fonts } from '@dead-lines-inc/frontend';

import { useApis } from '../api/use-apis';
import { useTexts } from '../localization/texts';
import { formatLeaderboardValue } from '../screens/Leaderboard/formatLeaderboardValue';
import { useLeaderboardData } from '../screens/Leaderboard/useLeaderboardData';

interface ChallengeResultPopupProps {
  playerId: string;
  challenge: challenges.Challenge;
  // Called with the challenge the player was moved on to.
  onJoined: (joined: JoinChallengeResponse) => void;
  onClose: () => void;
}

// The player's final result in a finished challenge — their value and place
// in the leaderboard — with a way on to a new task of the same type.
export function ChallengeResultPopup({
  playerId,
  challenge,
  onJoined,
  onClose,
}: ChallengeResultPopupProps) {
  const { playApi } = useApis();
  const texts = useTexts('challengeResult');
  const commonTexts = useTexts('common');
  const modeTexts = useTexts('modes');
  const errorTexts = useTexts('errors');

  const { result, error } = useLeaderboardData(challenge.id);
  const [joining, setJoining] = useState(false);
  const [joinFailed, setJoinFailed] = useState(false);

  const leaderboard = result?.leaderboard.leaderboard ?? [];
  const rank = leaderboard.findIndex((entry) => entry.player.id === playerId);
  const entry = rank === -1 ? undefined : leaderboard[rank];

  const valueLabel =
    challenge.type === PlayTypeEnum.time
      ? texts.avgTime
      : challenge.type === PlayTypeEnum.accuracy
        ? texts.boardsWon
        : texts.score;

  const joinChallenge = async () => {
    setJoining(true);
    setJoinFailed(false);
    try {
      onJoined(await playApi.joinChallenge({ type: challenge.type }));
    } catch {
      setJoinFailed(true);
      setJoining(false);
    }
  };

  return (
    <Pressable style={styles.scrim} onPress={joining ? undefined : onClose}>
      {/* Swallows taps, so only the scrim around the card closes it. */}
      <Pressable style={styles.card} onPress={() => undefined}>
        <Text style={styles.title}>{texts.title}</Text>
        <Text style={styles.subtitle}>{modeTexts[challenge.type].label}</Text>

        {error ? (
          <Text style={styles.error}>{errorTexts.loadLeaderboard}</Text>
        ) : !result ? (
          <ActivityIndicator style={styles.loading} color={colors.textSecondary} />
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {entry ? formatLeaderboardValue(challenge.type, entry, commonTexts.secondsShort) : '—'}
              </Text>
              <Text style={styles.statLabel}>{valueLabel}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {entry ? `${rank + 1} / ${leaderboard.length}` : '—'}
              </Text>
              <Text style={styles.statLabel}>{texts.place}</Text>
            </View>
          </View>
        )}

        {joinFailed && <Text style={styles.error}>{errorTexts.joinChallenge}</Text>}

        <Pressable
          style={[styles.primaryButton, joining && styles.primaryButtonBusy]}
          onPress={joinChallenge}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.primaryButtonText}>{texts.newTask}</Text>
          )}
        </Pressable>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: 22,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 20,
  },
  loading: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#c00',
    textAlign: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.accentQuota,
  },
  primaryButtonBusy: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.background,
  },
});
