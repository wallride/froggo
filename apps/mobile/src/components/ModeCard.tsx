import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';

import { challenges, PlayTypeEnum } from '@dead-lines-inc/common.models';
import { colors, fonts } from '@dead-lines-inc/frontend';

import { formatText, useTexts } from '../localization/texts';
import { backgroundFade } from './backgroundFade';
import { isChallengeOver } from './isChallengeOver';

const MINUTE_MS = 60 * 1000;

// Minutes until the challenge's endAt, clamped at zero once it's over.
function minutesUntil(endAt: string, now: number): number {
  return Math.max(0, Math.floor((new Date(endAt).getTime() - now) / MINUTE_MS));
}

const CARD_BORDER_WIDTH = 1;
// How far up from its bottom edge the art fades into its color.
const BACKGROUND_FADE_HEIGHT = 32;

interface ModeBackground {
  source: ImageSourcePropType;
  // Aspect ratio (width / height) of the art, in pixels of the source file.
  aspect: number;
  // Average color of the art's bottom edge (its lowest 4% of rows) — fills
  // the card below the art when the card is taller, and the art fades into
  // it, so there's no visible edge. 6-digit hex, see backgroundFade.
  color: string;
}

interface ModeMeta {
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
  background?: ModeBackground;
}

// Static display metadata per play type, looked up by ModeCard. The texts
// (label, description, footnote) are configured, see MobileTexts.modes.
// Live data (challenge/participation) is passed in separately per instance.
const MODE_META: Record<PlayTypeEnum, ModeMeta> = {
  [PlayTypeEnum.score]: {
    accent: colors.accentQuota,
    icon: 'sparkles-outline',
    background: {
      source: require('../../assets/images/score-card-background.jpg'),
      aspect: 1896 / 722,
      color: '#141919'
    }
  },
  [PlayTypeEnum.time]: {
    accent: colors.accentRush,
    icon: 'timer-outline',
    background: {
      source: require('../../assets/images/time-card-background.jpg'),
      aspect: 1904 / 719,
      color: '#121319'
    }
  },
  [PlayTypeEnum.accuracy]: {
    accent: colors.accentAccuracy,
    icon: 'locate-outline',
    background: {
      source: require('../../assets/images/accuracy-card-background.jpg'),
      aspect: 1790 / 771,
      color: '#11172a'
    }
  },
  [PlayTypeEnum.freePlay]: {
    accent: colors.accentOvertime,
    icon: 'cafe-outline',
    background: {
      source: require('../../assets/images/free-play-card-background.jpg'),
      aspect: 1906 / 733,
      color: '#0e0f22'
    }
  }
};

// Event progress/rank aren't backed by a real API yet — static placeholders
// matching the reference layout until board-event tracking exists.
const PLACEHOLDER_PROGRESS = '0/5';

export interface ModeCardProps {
  playType: PlayTypeEnum;
  challenge?: challenges.Challenge;
  challengeParticipation?: challenges.ChallengeParticipation;
  // Once the challenge is over, the button reads "finished" instead.
  onPress: () => void;
  // Challenge modes only: opens the challenge's leaderboard.
  onLeaderboardPress?: () => void;
}

export function ModeCard({
  playType,
  challenge,
  challengeParticipation,
  onPress,
  onLeaderboardPress,
}: ModeCardProps) {
  const meta = MODE_META[playType];
  const texts = useTexts('modes');
  const commonTexts = useTexts('common');
  const modeTexts = texts[playType];

  const totalBoards = challenge?.boardIds.length || 0;
  const playedBoards = challengeParticipation?.boardsPlayed || 0;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), MINUTE_MS);
    return () => clearInterval(interval);
  }, []);
  // The minute tick alone could leave the card playable for up to a minute
  // after the challenge is over — flip it right at endAt.
  const endAt = challenge?.endAt;
  useEffect(() => {
    if (!endAt) return;
    const msLeft = new Date(endAt).getTime() - Date.now();
    if (msLeft <= 0) return;
    const timeout = setTimeout(() => setNow(Date.now()), msLeft);
    return () => clearTimeout(timeout);
  }, [endAt]);
  const isFinished = !!challenge && isChallengeOver(challenge, now);

  // Card width, measured so the background can be given an explicit height:
  // an absolutely positioned Image with only an aspectRatio collapses to 0.
  const [cardWidth, setCardWidth] = useState(0);
  const backgroundWidth = cardWidth - 2 * CARD_BORDER_WIDTH;
  const backgroundSize = meta.background && {
    width: backgroundWidth,
    height: backgroundWidth / meta.background.aspect
  };

  return (
    <View
      style={[
        styles.modeCard,
        { borderColor: meta.accent },
        meta.background && { backgroundColor: meta.background.color }
      ]}
      onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
    >
      {meta.background && backgroundWidth > 0 && (
        // Scaled to the card width (height follows the art's aspect ratio) and
        // anchored to the top; anything taller than the card is cropped. Its
        // bottom edge fades into the card's color, which fills on below it.
        <View style={[styles.background, backgroundSize]}>
          {/* Sized explicitly: an Image that's only stretched to its
              container doesn't reliably render on the web target. */}
          <Image
            source={meta.background.source}
            style={backgroundSize}
            resizeMode="cover"
          />
          <View style={[styles.backgroundFade, backgroundFade(meta.background.color)]} />
        </View>
      )}
      <View style={styles.modeTopRow}>
        <View style={styles.modeHeading}>
          <View style={styles.modeHeader}>
            <Ionicons name={meta.icon} size={18} color={meta.accent}/>
            <Text style={styles.modeLabel}>{modeTexts.label}</Text>
          </View>
          <Text style={styles.modeDescription}>{modeTexts.description}</Text>
          {modeTexts.footnote && (
            <Text style={styles.modeFootnote}>{modeTexts.footnote}</Text>
          )}
        </View>
        {/* Room kept for the character art, once it exists. */}
        <View style={styles.artSlot} />
      </View>

      {challenge && totalBoards && (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: meta.accent, width: `${Math.round(playedBoards / totalBoards * 100)}%` }
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>{playedBoards} / {totalBoards}</Text>
          {!isFinished && (
            <Text style={styles.progressLabel}>{formatText(texts.timeLeft, {
                hours: Math.floor(minutesUntil(challenge.endAt, now) / 60),
                minutes: minutesUntil(challenge.endAt, now) % 60,
              })}</Text>
          )}
        </View>
      )}

      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.playButton, { borderColor: isFinished ? colors.surfaceBorder : meta.accent }]}
          onPress={onPress}
        >
          <Text style={[styles.playButtonText, { color: isFinished ? colors.textSecondary : meta.accent }]}>
            {isFinished ? texts.finished : commonTexts.play}
          </Text>
        </Pressable>
        {challenge && onLeaderboardPress && (
          <Pressable style={styles.leaderboardButton} onPress={onLeaderboardPress}>
            <Ionicons name="podium-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modeCard: {
    backgroundColor: colors.surface,
    borderWidth: CARD_BORDER_WIDTH,
    borderRadius: 16,
    padding: 14,
    overflow: 'hidden'
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0
  },
  backgroundFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BACKGROUND_FADE_HEIGHT
  },
  modeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  modeHeading: {
    flex: 1,
    paddingRight: 10
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  modeLabel: {
    fontFamily: fonts.headingMedium,
    fontSize: 16,
    color: colors.textPrimary
  },
  modeDescription: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4
  },
  modeFootnote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8
  },
  artSlot: {
    width: 48,
    height: 48
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 2
  },
  progressLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14
  },
  // Square, as tall as the play button next to it.
  leaderboardButton: {
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  playButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  playButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  }
});
