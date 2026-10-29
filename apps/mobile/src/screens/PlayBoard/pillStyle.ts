import { StyleSheet } from 'react-native';

import { colors } from '@dead-lines-inc/frontend';

import { BOARD_HORIZONTAL_SPACING } from './boardLayout';

// Shared pill look used by both the stars row (PlayTopBar) and the
// score/time chip (PlayResultChip) — kept as one style so the two stay
// identical on purpose rather than by coincidence.
export const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    alignSelf: 'stretch',
    paddingHorizontal: BOARD_HORIZONTAL_SPACING / 2,
    paddingVertical: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
});
