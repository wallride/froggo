import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors } from '@dead-lines-inc/frontend';

interface OrnamentProps {
  // What sits in the middle of the rule — an icon, a label, anything.
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// A thin horizontal rule with its content in the middle, used to frame
// headlines. Without content it's a plain rule.
export function Ornament({ children, style }: OrnamentProps) {
  return (
    <View style={[styles.ornament, style]}>
      <View style={styles.line} />
      {children}
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  ornament: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceBorder,
  },
});
