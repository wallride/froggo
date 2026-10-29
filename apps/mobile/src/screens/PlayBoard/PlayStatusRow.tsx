import type { PropsWithChildren } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@dead-lines-inc/frontend';

import { formatText, useTexts } from '../../localization/texts';

interface PlayStatusRowProps {
  foundTargets: number;
  boardSize: number;
}

// The row above the board: how many souls are saved, and — as children, on
// the right — whatever headline result the play mode has (see
// ScorePlayStatusRow, TimePlayStatusRow, AccuracyPlayStatusRow). Free play
// has none.
export function PlayStatusRow({
  foundTargets,
  boardSize,
  children,
}: PropsWithChildren<PlayStatusRowProps>) {
  const texts = useTexts('playBoard');

  return (
    <View style={styles.statusRow}>
      {children}
      <View style={{flexDirection: 'row'}}>
        <Image
          source={require('../../../assets/images/cell/targets/target.png')}
          style={{ width: 30, height: 30 }}
          resizeMode="contain"
        />
        <Text style={styles.soulsSaved}>
          {formatText(texts.soulsSaved, { found: foundTargets, total: boardSize })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  soulsSaved: {
    fontFamily: fonts.semiBold,
    fontSize: 21,
    color: colors.textSecondary,
  },
});
