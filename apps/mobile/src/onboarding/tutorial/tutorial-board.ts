import type { PlayBoard } from '@dead-lines-inc/common.models';

// The 5×5 board the tutorial shows the game on. `kinds` is the colour of
// each cell row by row, `souls` where the souls hide as [row, column] — one
// in every row, column and colour, none of them touching. Edit freely, but
// keep it a valid board (validateBoard).
const kinds = [
  [4, 3, 3, 5, 5],
  [4, 3, 1, 5, 2],
  [4, 3, 3, 5, 2],
  [4, 3, 5, 5, 5],
  [5, 5, 5, 5, 5],
];
const souls: [number, number][] = [
  [0, 0],
  [1, 2],
  [2, 4],
  [3, 1],
  [4, 3],
];

export const TUTORIAL_BOARD: PlayBoard = {
  id: 'tutorial',
  size: kinds.length,
  cells: kinds.flatMap((row, r) =>
    row.map((kind, c) => ({
      key: r * row.length + c,
      kind,
      hasTarget: souls.some(([sr, sc]) => sr === r && sc === c),
    })),
  ),
};
