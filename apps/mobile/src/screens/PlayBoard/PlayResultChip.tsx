import type { RefObject } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { PlayTypeEnum } from '@dead-lines-inc/common.models';
import { colors, fonts } from '@dead-lines-inc/frontend';

import { pillStyles } from './pillStyle';
import { TYPE_ICON } from './typeIcon';

interface PlayResultChipProps {
  type: PlayTypeEnum;
  label: string;
  chipRef?: RefObject<View | null>;
  // The widest label the chip will show: its width is reserved up front, so
  // the chip (and the timeline next to it) doesn't resize as the label changes.
  // A label wider than this still widens the chip.
  widestLabel?: string;
}

// The mode's icon and live result (time or score) in the pill on the right
// of the status row.
export function PlayResultChip({ type, label, chipRef, widestLabel }: PlayResultChipProps) {
  return (
    <View ref={chipRef} collapsable={false} style={pillStyles.pill}>
      <Ionicons name={TYPE_ICON[type]} size={21} color={colors.textMuted} />
      {/* A column is as wide as its widest child, so the zero-height,
          invisible widestLabel sets the minimum width. */}
      <View>
        {widestLabel !== undefined && (
          <Text style={[styles.resultText, styles.widthReserve]} aria-hidden>
            {widestLabel}
          </Text>
        )}
        <Text style={styles.resultText}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  resultText: {
    fontFamily: fonts.regular,
    fontSize: 21,
    color: colors.accentRush,
    // Equal-width digits, so the label doesn't jitter within its width.
    fontVariant: ['tabular-nums'],
  },
  widthReserve: {
    height: 0,
    opacity: 0,
  },
});
