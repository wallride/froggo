import { Board, Cell } from '@dead-lines-inc/common.models';

type CellPositionMapper = (row: number, col: number, size: number) => { row: number; col: number };

// The 8 symmetries of a square (dihedral group D4): identity, the three
// non-trivial rotations, and the four axis/diagonal reflections. Each maps a
// destination (row, col) back to the source cell that belongs there.
const TRANSFORMS: CellPositionMapper[] = [
  (row, col) => ({ row, col }),
  (row, col, size) => ({ row: size - 1 - col, col: row }),
  (row, col, size) => ({ row: size - 1 - row, col: size - 1 - col }),
  (row, col, size) => ({ row: col, col: size - 1 - row }),
  (row, col, size) => ({ row, col: size - 1 - col }),
  (row, col, size) => ({ row: size - 1 - row, col }),
  (row, col) => ({ row: col, col: row }),
  (row, col, size) => ({ row: size - 1 - col, col: size - 1 - row }),
];

// Applies a random rotation/reflection to a board's cells so the same board
// doesn't always look identical to players across plays.
export class BoardTransformer {
  transform(board: Board): Board {
    const { size, cells } = board;
    const mapper = TRANSFORMS[Math.floor(Math.random() * TRANSFORMS.length)];

    const transformedCells: Cell[] = new Array(cells.length);
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const source = mapper(row, col, size);
        transformedCells[row * size + col] = cells[source.row * size + source.col];
      }
    }

    return { ...board, cells: transformedCells };
  }
}
