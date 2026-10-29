import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import type { BoardLayout } from './boardLayout';

// The glowing frame the board's grid sits in — spans the screen between the
// margins, its padding (see boardLayout) filling exactly the room the grid
// leaves. Should the real width differ from the frame-based one, the grid
// still centres.
export function BoardFrame({ layout, children }: PropsWithChildren<{ layout: BoardLayout }>) {
  return (
    <View
      style={[
        styles.frame,
        {
          padding: layout.boardContainerInnerPadding,
          borderRadius: layout.boardContainerPadding,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'stretch',
    alignItems: 'center',
    boxShadow: [
      { offsetX: 0, offsetY: 0, blurRadius: 40, color: 'rgba(255,205,120,0.4)', inset: true },
      { offsetX: 0, offsetY: 0, blurRadius: 2, color: 'rgba(255,255,0,1)', inset: false },
    ],
  },
});
