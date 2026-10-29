import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { challenges } from '@dead-lines-inc/common.models';
import { colors, fonts } from '@dead-lines-inc/frontend';

import type { RootStackParamList } from '../../app/Navigation';
import { isChallengeOver } from '../../components/isChallengeOver';
import { usePlayer } from '../../identity/player-context';
import { useFrameDimensions } from '../../layout/app-frame';
import { Screen } from '../../layout/Screen';
import { screenBackgrounds } from '../../layout/screen-backgrounds';
import { useTexts } from '../../localization/texts';
import { LoadingScreen } from '../LoadingScreen';
import { formatLeaderboardValue, leaderboardRankedValue } from './formatLeaderboardValue';
import { formatPresence } from './formatPresence';
import { LeaderboardRow, ROW_HEIGHT } from './LeaderboardRow';
import { useLeaderboardData } from './useLeaderboardData';

const PRESENCE_REFRESH_MS = 15 * 1000;
const ROWS_BOTTOM_PADDING = 16;

const BACKGROUND_COLOR = screenBackgrounds.leaderboard.color;
// Where the title starts, as a share of the screen width — just under the
// trophy ornament in the art, so it scales together with the image.
const TITLE_TOP_RATIO = 0.19;
const TITLE_COLOR = '#ecdcbf';
// The bottom panel with the buttons, as a share of the screen height — it
// stays put while the rows scroll above it.
const BUTTONS_HEIGHT_RATIO = 0.2;

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

export function LeaderboardScreen({ route }: Props) {
  const { challenge, challengeParticipation, previousLeaderboard, fromHome } = route.params;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'Leaderboard'>>();
  const { player } = usePlayer();
  const frame = useFrameDimensions();
  const texts = useTexts('leaderboard');
  const commonTexts = useTexts('common');
  const modeTexts = useTexts('modes');
  const errorTexts = useTexts('errors');

  const { result, error } = useLeaderboardData(challenge.id);

  // Keeps presence (online / played N minutes ago) current while on screen.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), PRESENCE_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  const rows = useMemo(() => {
    if (!result) return [];

    const previousRankByPlayerId = new Map(
      (previousLeaderboard?.leaderboard ?? []).map((entry, index) => [entry.player.id, index]),
    );
    const rankedValue = (entry: challenges.ChallengeParticipation) =>
      leaderboardRankedValue(challenge.type, entry);
    const previousScoreByPlayerId = new Map(
      (previousLeaderboard?.leaderboard ?? []).map((entry) => [entry.player.id, rankedValue(entry)]),
    );

    return result.leaderboard.leaderboard.map((entry, rank) => {
      const previousRank = previousRankByPlayerId.get(entry.player.id) ?? null;
      const isViewer = entry.player.id === player?.id;
      const scoreChanged = previousScoreByPlayerId.get(entry.player.id) !== rankedValue(entry);

      return {
        key: entry.player.id,
        rank,
        previousRank,
        name: entry.player.name,
        avatarId: entry.player.avatarId,
        presence: formatPresence(entry.lastPlayTimestamp, now, texts),
        value: formatLeaderboardValue(challenge.type, entry, commonTexts.secondsShort),
        isViewer,
        // After a play: always highlight the viewer's own row (they just
        // played), plus anyone whose position or score moved because of it.
        // Without a snapshot to compare to, nothing is known to have changed.
        changed: !!previousLeaderboard && (isViewer || previousRank !== rank || scoreChanged),
      };
    });
  }, [result, previousLeaderboard, player, challenge.type, commonTexts.secondsShort, now, texts]);

  // Once the rows are in, scrolls smoothly so the viewer's row lands in the
  // middle of the list — as close as the list's ends allow. Needs both the
  // list's own height and its content laid out, whichever comes last.
  const scrollRef = useRef<ScrollView>(null);
  const viewportHeight = useRef(0);
  const scrolledToViewer = useRef(false);
  const viewerRank = rows.find((row) => row.isViewer)?.rank ?? null;
  const scrollToViewer = () => {
    if (scrolledToViewer.current || viewerRank === null || !viewportHeight.current) return;
    scrolledToViewer.current = true;

    const contentHeight = rows.length * ROW_HEIGHT + ROWS_BOTTOM_PADDING;
    const maxOffset = Math.max(0, contentHeight - viewportHeight.current);
    const centeredOffset = viewerRank * ROW_HEIGHT - (viewportHeight.current - ROW_HEIGHT) / 2;
    const offset = Math.min(maxOffset, Math.max(0, centeredOffset));
    if (offset > 0) {
      scrollRef.current?.scrollTo({ y: offset, animated: true });
    }
  };

  if (!player || (!result && !error)) {
    return <LoadingScreen error={error ? errorTexts.loadLeaderboard : null} />;
  }

  // Only while the challenge is still on and has boards left for the player.
  const canPlayNext =
    !isChallengeOver(challenge) &&
    (result?.remainingBoardIds.length ?? 0) > 0;

  return (
    <Screen background={screenBackgrounds.leaderboard} safeArea={false}>
      <View style={[styles.header, { paddingTop: frame.width * TITLE_TOP_RATIO }]}>
        <Text style={styles.title}>{texts.title}</Text>
        <Text style={styles.subtitle}>
          {modeTexts[challenge.type].label}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onLayout={(event) => {
          viewportHeight.current = event.nativeEvent.layout.height;
          scrollToViewer();
        }}
        onContentSizeChange={scrollToViewer}
      >
        <View style={[styles.rows, { height: rows.length * ROW_HEIGHT }]}>
          {rows.map((row) => (
            <LeaderboardRow
              key={row.key}
              rank={row.rank}
              previousRank={row.previousRank}
              name={row.name}
              avatarId={row.avatarId}
              presence={row.presence}
              onlineLabel={texts.online}
              value={row.value}
              isViewer={row.isViewer}
              changed={row.changed}
            />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.buttonRow, { height: frame.height * BUTTONS_HEIGHT_RATIO }]}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.popTo('Home')}
        >
          <Ionicons name="home" size={18} color={TITLE_COLOR} />
          <Text style={styles.secondaryButtonText}>{commonTexts.goHome}</Text>
        </Pressable>
        {canPlayNext && (
          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              navigation.replace('Play', {
                playType: challenge.type,
                challenge,
                challengeParticipation,
              })
            }
          >
            <Text style={styles.primaryButtonText}>
              {fromHome ? commonTexts.play : commonTexts.playNext}
            </Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: ROWS_BOTTOM_PADDING,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 34,
    textAlign: 'center',
    color: TITLE_COLOR,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 17,
    textAlign: 'center',
    color: '#8f89ad',
    marginTop: 2,
    marginBottom: 24,
  },
  rows: {
    position: 'relative',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 40,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentQuota,
  },
  primaryButtonText: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: BACKGROUND_COLOR,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52,48,82,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(143,137,173,0.35)',
  },
  secondaryButtonText: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: TITLE_COLOR,
  },
});
