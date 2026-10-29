import { useEffect, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PlayTypeEnum } from '@dead-lines-inc/common.models';
import { colors, fonts } from '@dead-lines-inc/frontend';

import { Ornament } from '../../components/Ornament';
import { useTexts } from '../../localization/texts';
import { formatPlayResult } from './formatPlayResult';
import { MultiplierStarFlight } from './MultiplierStarFlight';
import { MULTIPLIER_POP_MS } from './scoreAnimation';
import { TYPE_ICON } from './typeIcon';
import type { StarFlight } from './useStarMultiplier';

const MULTIPLIER_COLOR = '#ffd60a';

const CARD_BORDER_WIDTH = 1;
// The card background art per outcome; aspect is width / height of the file.
const CARD_BACKGROUNDS = {
  won: {
    source: require('../../../assets/images/play-result-background.jpg'),
    aspect: 1098 / 1433,
  },
  lost: {
    source: require('../../../assets/images/play-lost-background.jpg'),
    aspect: 1097 / 1434,
  },
};

// What a won quota play shows instead of the souls and stars: the score with
// the multiplier the stars left fly into (see useStarMultiplier).
export interface ResultStarMultiplier {
  // 0 until the first star lands.
  value: number;
  flights: StarFlight[];
  onFlightArrived: (flight: StarFlight) => void;
  // Where the stars fly to, and the layer they're drawn in.
  targetRef: RefObject<View | null>;
  layerRef: RefObject<View | null>;
}

// Swells briefly each time the multiplier goes up.
function MultiplierLabel({
  value,
  targetRef,
}: {
  value: number;
  targetRef: RefObject<View | null>;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (value === 0) return;
    scale.value = withSequence(
      withTiming(1.5, { duration: MULTIPLIER_POP_MS }),
      withTiming(1, { duration: MULTIPLIER_POP_MS }),
    );
    // scale is a stable shared value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    // Laid out (invisibly) before the first star lands, so the stars have
    // somewhere to fly to and the score doesn't shift when it shows up.
    <Animated.View
      ref={targetRef}
      collapsable={false}
      style={[value === 0 && styles.hidden, animatedStyle]}
    >
      <Text style={styles.multiplier}>x{Math.max(value, 1)}</Text>
    </Animated.View>
  );
}

interface PlayResultOverlayProps {
  isWon: boolean;
  stars: number;
  maxStars: number;
  foundTargets: number;
  boardSize: number;
  type: PlayTypeEnum;
  elapsedSeconds: number;
  score: number;
  hasChallenge: boolean;
  // A won quota play only.
  starMultiplier?: ResultStarMultiplier;
  // Challenge mode only: leads to the Leaderboard screen.
  onContinue: () => void;
  // Free play only.
  onGoHome: () => void;
  onPlayNext: () => void;
}

export function PlayResultOverlay({
  isWon,
  stars,
  maxStars,
  foundTargets,
  boardSize,
  type,
  elapsedSeconds,
  score,
  hasChallenge,
  starMultiplier,
  onContinue,
  onGoHome,
  onPlayNext,
}: PlayResultOverlayProps) {
  const texts = useTexts('playResult');
  const commonTexts = useTexts('common');
  const modeTexts = useTexts('modes');
  const deathTexts = useTexts('death');
  const message = isWon ? deathTexts.playWon : deathTexts.playLost;
  const resultLabel = formatPlayResult(type, elapsedSeconds, score, commonTexts.secondsShort);

  // Card size, measured so the background can be given explicit dimensions:
  // scaled to the card width and anchored to the top. A card taller than that
  // scales it up to fill the height instead (centered), so no strip is left.
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const innerWidth = cardSize.width - 2 * CARD_BORDER_WIDTH;
  const innerHeight = cardSize.height - 2 * CARD_BORDER_WIDTH;
  const background = isWon ? CARD_BACKGROUNDS.won : CARD_BACKGROUNDS.lost;
  const backgroundHeight = Math.max(innerWidth / background.aspect, innerHeight);
  const backgroundWidth = backgroundHeight * background.aspect;

  const stats: ReactNode[] = starMultiplier
    ? [
        <View key="score" style={styles.stat}>
          <View style={styles.statValueRow}>
            <Ionicons name={TYPE_ICON[type]} size={26} color={colors.textPrimary} />
            <Text style={styles.finalScore} numberOfLines={1} adjustsFontSizeToFit>
              {resultLabel}
            </Text>
          </View>
          <Text style={styles.statLabel}>{texts.score}</Text>
        </View>,
        <View key="multiplier" style={styles.stat}>
          <Text style={styles.bonusCaption}>{texts.bonus}</Text>
          <MultiplierLabel
            value={starMultiplier.value}
            targetRef={starMultiplier.targetRef}
          />
        </View>,
      ]
    : [
        <View key="souls" style={styles.stat}>
          <Text style={styles.statValue}>
            {foundTargets}/{boardSize}
          </Text>
          <Text style={styles.statLabel}>{texts.soulsSaved}</Text>
        </View>,
        ...(type !== PlayTypeEnum.accuracy
          ? [
              <View key="stars" style={styles.stat}>
                <Text style={styles.statValue}>
                  {stars}/{maxStars}
                </Text>
                <Text style={styles.statLabel}>{texts.stars}</Text>
              </View>,
            ]
          : []),
        ...(resultLabel !== null
          ? [
              <View key="result" style={styles.stat}>
                <View style={styles.statValueRow}>
                  <Ionicons name={TYPE_ICON[type]} size={20} color={colors.textPrimary} />
                  <Text style={styles.statValue}>{resultLabel}</Text>
                </View>
                <Text style={styles.statLabel}>
                  {type === PlayTypeEnum.time ? texts.time : texts.score}
                </Text>
              </View>,
            ]
          : []),
      ];

  return (
    // Quota plays leave the board undimmed.
    <View style={[styles.scrim, type === PlayTypeEnum.score && styles.scrimClear]}>
      <View
        style={styles.card}
        onLayout={(e) =>
          setCardSize({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          })
        }
      >
        {innerWidth > 0 && (
          <Image
            source={background.source}
            style={[
              styles.cardBackground,
              {
                width: backgroundWidth,
                height: backgroundHeight,
                left: (innerWidth - backgroundWidth) / 2,
              },
            ]}
            resizeMode="cover"
          />
        )}

        <Ornament>
          <Ionicons name="skull-outline" size={18} color={colors.textMuted} />
        </Ornament>
        <Text style={[styles.headline, isWon ? styles.headlineWon : styles.headlineLost]}>
          {isWon ? texts.won : texts.lost}
        </Text>
        <Ornament>
          <Text style={styles.statLabel}>{modeTexts[type].label}</Text>
        </Ornament>

        {/* The right half; Death, in the background art, fills the left. */}
        <View style={styles.middle}>
          <View style={styles.statsPanel}>
            {stats.map((stat, i) => (
              <View key={i} style={styles.statsPanelItem}>
                {i > 0 && <View style={styles.statsDivider} />}
                {stat}
              </View>
            ))}
          </View>
        </View>

        {/* The tail points up at Death. */}
        <View style={styles.bubble}>
          <View style={styles.bubbleTail} />
          <Text style={styles.quoteMark}>“</Text>
          <View style={styles.bubbleBody}>
            <Text style={styles.bubbleLine}>{message}</Text>
            <Text style={styles.bubbleTag}>{deathTexts.tag}</Text>
          </View>
        </View>

        {hasChallenge ? (
          <Pressable style={styles.primaryButton} onPress={onContinue}>
            <Text style={styles.primaryButtonText}>{commonTexts.continue}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </Pressable>
        ) : (
          <View style={styles.buttonRow}>
            <Pressable style={styles.secondaryButton} onPress={onGoHome}>
              <Text style={styles.secondaryButtonText}>{commonTexts.goHome}</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={onPlayNext}>
              <Text style={styles.primaryButtonText}>{commonTexts.playNext}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.background} />
            </Pressable>
          </View>
        )}
      </View>
      {starMultiplier && (
        <View
          ref={starMultiplier.layerRef}
          collapsable={false}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          {starMultiplier.flights.map((flight) => (
            <MultiplierStarFlight
              key={flight.step}
              flight={flight}
              onArrived={starMultiplier.onFlightArrived}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const BUBBLE_TAIL_WIDTH = 20;
const BUBBLE_TAIL_HEIGHT = 12;

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
  scrimClear: {
    backgroundColor: 'transparent',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderWidth: CARD_BORDER_WIDTH,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
    padding: 20,
    // Clips the background image to the rounded corners.
    overflow: 'hidden',
    boxShadow: [
      { offsetX: 0, offsetY: 0, blurRadius: 10, color: '#000' },
      { offsetX: 0, offsetY: 0, blurRadius: 50, color: '#000' },
      { offsetX: 0, offsetY: 0, blurRadius: 100, color: '#000' },
      { offsetX: 0, offsetY: 0, blurRadius: 150, color: '#000' },
      { offsetX: 0, offsetY: 0, blurRadius: 20, color: '#fff', inset: true },
    ],
  },
  cardBackground: {
    position: 'absolute',
    top: 0,
  },
  headline: {
    fontFamily: fonts.headingExtraBold,
    fontSize: 40,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  headlineWon: {
    color: colors.accentQuota,
  },
  headlineLost: {
    color: '#c00',
  },
  middle: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    minHeight: 200,
    marginTop: 16,
    marginBottom: 24,
  },
  statsPanel: {
    width: '48%',
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statsPanelItem: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 10,
  },
  statsDivider: {
    alignSelf: 'stretch',
    height: 1,
    marginTop: 4,
    backgroundColor: colors.surfaceBorder,
  },
  bubble: {
    flexDirection: 'row',
    gap: 8,
    marginTop: BUBBLE_TAIL_HEIGHT,
    marginBottom: 16,
    backgroundColor: colors.bubbleBackground,
    borderRadius: 14,
    padding: 12,
  },
  // Upward triangle on the top edge, centered at 30% from the left.
  bubbleTail: {
    position: 'absolute',
    top: -BUBBLE_TAIL_HEIGHT,
    left: '30%',
    marginLeft: -BUBBLE_TAIL_WIDTH / 2,
    width: 0,
    height: 0,
    borderLeftWidth: BUBBLE_TAIL_WIDTH / 2,
    borderRightWidth: BUBBLE_TAIL_WIDTH / 2,
    borderBottomWidth: BUBBLE_TAIL_HEIGHT,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.bubbleBackground,
  },
  quoteMark: {
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 34,
    color: colors.bubbleTextMuted,
  },
  bubbleBody: {
    flex: 1,
  },
  bubbleLine: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.bubbleText,
    lineHeight: 18,
  },
  bubbleTag: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.bubbleTextMuted,
    marginTop: 6,
    marginLeft: "50%",
    letterSpacing: 0.5,
  },
  stat: {
    alignItems: 'center',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 32,
    color: colors.textPrimary,
  },
  finalScore: {
    fontFamily: fonts.bold,
    fontSize: 40,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  multiplier: {
    fontFamily: fonts.bold,
    fontSize: 40,
    color: MULTIPLIER_COLOR,
  },
  hidden: {
    opacity: 0,
  },
  bonusCaption: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: colors.accentQuota,
  },
  primaryButtonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.background,
  },
  secondaryButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  secondaryButtonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textPrimary,
  },
});
