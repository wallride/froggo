import type { RefObject } from 'react';
import { ImageSourcePropType, PanResponder, StyleSheet, View } from 'react-native';

import { PlayCell } from '@dead-lines-inc/common.models';

import { BoardCell } from './BoardCell';

interface BoardGridProps {
  size: number;
  cells: PlayCell[];
  cellTextures: (ImageSourcePropType | undefined)[];
  cellSize: number;
  cellBorderRadius: number;
  // For playing on the board. A board that's only shown (the tutorial)
  // leaves them out.
  gridRef?: RefObject<View | null>;
  panHandlers?: ReturnType<typeof PanResponder.create>['panHandlers'];
  onLayout?: () => void;
}

export function BoardGrid({
  size,
  cells,
  cellTextures,
  cellSize,
  cellBorderRadius,
  gridRef,
  panHandlers,
  onLayout,
}: BoardGridProps) {
  return (
    <View ref={gridRef} onLayout={onLayout} {...panHandlers}>
      {Array.from({ length: size }).map((_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: size }).map((_, col) => {
            const index = row * size + col;
            return (
              <BoardCell
                key={col}
                cell={cells[index]}
                texture={cellTextures[index]}
                size={cellSize}
                borderRadius={cellBorderRadius}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
});
