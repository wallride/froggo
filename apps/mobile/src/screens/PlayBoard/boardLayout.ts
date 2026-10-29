import { useFrameDimensions } from '../../layout/app-frame';

// Margin between the screen edges and everything on the play screen — the
// top bar, the status row and the board container all line up on it, for
// every play type and board size. The grid scales to fill the rest.
export const BOARD_HORIZONTAL_SPACING = 10;
export const CELL_MARGIN = 2;
// Each cell's margin eats into its row beyond its own width/height, so it
// has to be subtracted back out when sizing cells to fit the screen.
export const CELL_SPACING = CELL_MARGIN * 2;

export interface BoardLayout {
  cellSize: number;
  cellBorderRadius: number;
  boardContainerPadding: number;
  // The board container's padding around the grid, the same on all sides.
  boardContainerInnerPadding: number;
  screenPadding: number;
}

// All screen-size-derived measurements for the board, in one place so the
// grid, its cells, and the surrounding rows stay pixel-consistent.
export function useBoardLayout(boardSize: number): BoardLayout {
  const { width: frameWidth } = useFrameDimensions();

  // Smaller boards (bigger cells) get a more rounded corner; larger boards
  // (smaller cells) get a subtler one.
  const cellBorderRadius = 13 - boardSize;
  const boardContainerPadding = cellBorderRadius + BOARD_HORIZONTAL_SPACING;
  // The board container spans the screen between the margins and pads the
  // grid by at least boardContainerPadding / 2 on each side. Whatever the
  // rounding of cellSize leaves over goes into that padding too — on all four
  // sides alike, so the grid sits evenly inside.
  const containerWidth = frameWidth - BOARD_HORIZONTAL_SPACING * 2;
  const cellSize =
    Math.floor((containerWidth - boardContainerPadding) / boardSize) - CELL_SPACING;
  const boardContainerInnerPadding =
    (containerWidth - boardSize * (cellSize + CELL_SPACING)) / 3;

  return {
    cellSize,
    cellBorderRadius,
    boardContainerPadding,
    boardContainerInnerPadding,
    screenPadding: 20 - boardSize,
  };
}
