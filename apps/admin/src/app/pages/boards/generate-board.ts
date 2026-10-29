import { Cell } from '@dead-lines-inc/common.models';

function shuffle<T>(items: T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// One target per row/col, no two targets in adjacent rows sharing a
// near column (matches validateBoard's neighbour check).
function placeTargetColumns(size: number): number[] {
  const columns: number[] = [];
  const used = new Array<boolean>(size).fill(false);

  function backtrack(row: number): boolean {
    if (row === size) return true;
    const candidates = shuffle(
      Array.from({ length: size }, (_, col) => col).filter(
        (col) =>
          !used[col] &&
          (row === 0 || Math.abs(col - columns[row - 1]) > 1),
      ),
    );
    for (const col of candidates) {
      used[col] = true;
      columns[row] = col;
      if (backtrack(row + 1)) return true;
      used[col] = false;
    }
    return false;
  }

  backtrack(0);
  return columns;
}

export function generateBoard(size: number): Cell[] {
  const cells: Cell[] = Array.from({ length: size * size }, (_, index) => ({
    key: index + 1,
    kind: 0,
  }));

  const targetColumns = placeTargetColumns(size);
  const frontier: { index: number; kind: number }[] = [];

  const pushNeighbours = (index: number, kind: number) => {
    const row = Math.floor(index / size);
    const col = index % size;
    const neighbours = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ];
    for (const [nRow, nCol] of neighbours) {
      if (nRow < 0 || nRow >= size || nCol < 0 || nCol >= size) continue;
      const nIndex = nRow * size + nCol;
      if (cells[nIndex].kind !== 0) continue;
      frontier.push({ index: nIndex, kind });
    }
  };

  targetColumns.forEach((col, row) => {
    const kind = row + 1;
    const index = row * size + col;
    cells[index] = { key: index + 1, kind, hasTarget: true };
    pushNeighbours(index, kind);
  });

  while (frontier.length > 0) {
    const pick = Math.floor(Math.random() * frontier.length);
    const { index, kind } = frontier[pick];
    frontier.splice(pick, 1);
    if (cells[index].kind !== 0) continue;
    cells[index] = { key: index + 1, kind };
    pushNeighbours(index, kind);
  }

  return cells;
}
