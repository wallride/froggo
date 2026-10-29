import type { RefObject } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@dead-lines-inc/frontend';

import { useTexts } from '../../localization/texts';
import { pillStyles } from './pillStyle';

interface PlayTopBarProps {
  // Left out in modes that don't count stars.
  stars?: number;
  maxStars?: number;
  // Filled with each star's view, in order, so stars can fly off from it.
  starRefs?: RefObject<(View | null)[]>;
  onGiveUp: () => void;
}

export function PlayTopBar({ stars, maxStars, starRefs, onGiveUp }: PlayTopBarProps) {
  const texts = useTexts('playBoard');
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarSide}>
        {
          /**
           * "Give up" button with left arrow
           * Left-aligned
           */
        }
        <Pressable style={styles.giveUpButton} onPress={onGiveUp}>
          <Ionicons name="arrow-back" size={16} color={colors.textPrimary} />
          <Text style={styles.giveUpText}>{texts.giveUp}</Text>
        </Pressable>
      </View>
      <View style={[styles.topBarSide, styles.topBarSideRight]}>
        {
          /**
           * This View must stick to the right
           */
        }
        {stars !== undefined && maxStars !== undefined && (
          <View style={pillStyles.pill}>
            {Array.from({ length: maxStars }).map((_, i) => (
              <View
                key={i}
                ref={(node) => {
                  if (starRefs) starRefs.current[i] = node;
                }}
                collapsable={false}
                style={styles.starSlot}
              >
                <Image
                  source={require('../../../assets/images/scythe_gold_150x150.png')}
                  style={[styles.star, i >= stars && styles.starSpent]}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    // Its edges sit on the screen margin, in line with the board below.
    alignSelf: 'stretch',
    marginBottom: 40,
    marginTop: 40,
  },
  topBarSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarSideRight: {
    justifyContent: 'flex-end',
  },
  giveUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  giveUpText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  starSlot: {
    marginHorizontal: 2,
  },
  star: {
    width: 28,
    height: 28,
  },
  starSpent: {
    opacity: 0.25,
  },
});
