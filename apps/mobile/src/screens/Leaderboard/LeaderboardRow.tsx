import { useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts } from '@dead-lines-inc/frontend';

import { PlayerAvatar } from '../../components/PlayerAvatar';
import type { Presence } from './formatPresence';

export const ROW_HEIGHT = 72;
const AVATAR_SIZE = 44;

const NAME_COLOR = '#ecdcbf';
const DIVIDER_COLOR = 'rgba(255,255,255,0.06)';
// Gold, silver and bronze for the top three places.
const PODIUM_RANK_COLORS = ['#e0a52c', '#a9a6b8', '#b0875a'];

interface LeaderboardRowProps {
  rank: number; // 0-based, current
  previousRank: number | null; // null = wasn't on the previous snapshot
  name: string;
  avatarId: string;
  presence: Presence | null;
  onlineLabel: string;
  value: string;
  isViewer: boolean;
  changed: boolean;
}

// Slides from its previous rank (or straight in, if it has none) to its
// current one, with a brief highlight flash when something about it
// changed this play.
export function LeaderboardRow({
  rank,
  previousRank,
  name,
  avatarId,
  presence,
  onlineLabel,
  value,
  isViewer,
  changed,
}: LeaderboardRowProps) {
  const translateY = useSharedValue((previousRank ?? rank) * ROW_HEIGHT);
  const highlight = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(rank * ROW_HEIGHT, { duration: 500 });
    if (changed) {
      highlight.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(600, withTiming(0, { duration: 400 })),
      );
    }
    // Intentionally only reacts to rank/changed — re-running on every
    // parent re-render would restart the flash mid-animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rank, changed]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  // A separate layer, so the flash doesn't replace the viewer row's own tint.
  const highlightStyle = useAnimatedStyle(() => ({
    opacity: highlight.value,
  }));

  const rankColor = isViewer
    ? colors.accentQuota
    : PODIUM_RANK_COLORS[rank] ?? colors.textMuted;

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <View style={[styles.content, isViewer ? styles.viewerContent : styles.divider]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.highlight, highlightStyle]}
        />
        <Text style={[styles.rank, { color: rankColor }]}>{rank + 1}</Text>
        <PlayerAvatar
          avatarId={avatarId}
          name={name}
          size={AVATAR_SIZE}
          style={[styles.avatar, isViewer && styles.viewerAvatar]}
        />
        <View style={styles.nameColumn}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {presence?.online && (
            <View style={styles.onlinePill}>
              <Text style={styles.onlineText}>{onlineLabel}</Text>
            </View>
          )}
          {presence && !presence.online && (
            <Text style={styles.lastSeen} numberOfLines={1}>{presence.label}</Text>
          )}
        </View>
        <Text style={styles.value}>{value}</Text>
        <MaterialCommunityIcons
          name="star-four-points"
          size={16}
          color={colors.accentQuota}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    paddingVertical: 2,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  divider: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DIVIDER_COLOR,
  },
  viewerContent: {
    borderWidth: 1,
    borderColor: 'rgba(61,220,132,0.35)',
    backgroundColor: 'rgba(61,220,132,0.07)',
  },
  highlight: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(224,165,44,0.25)',
  },
  rank: {
    fontFamily: fonts.headingMedium,
    width: 26,
    fontSize: 26,
    textAlign: 'center',
  },
  avatar: {
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  viewerAvatar: {
    borderColor: 'rgba(61,220,132,0.5)',
  },
  nameColumn: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 0,
  },
  name: {
    fontFamily: fonts.headingMedium,
    fontSize: 15,
    color: NAME_COLOR,
  },
  onlinePill: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(61,220,132,0.18)',
  },
  onlineText: {
    fontFamily: fonts.regular,
    textTransform: 'lowercase',
    fontSize: 13,
    color: colors.accentQuota,
  },
  lastSeen: {
    fontFamily: fonts.regular,
    textTransform: 'lowercase',
    fontSize: 14,
    color: colors.textMuted,
  },
  value: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: NAME_COLOR,
  },
});
