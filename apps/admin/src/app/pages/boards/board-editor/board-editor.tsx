import { MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef } from 'react';

import { Cell } from '@dead-lines-inc/common.models';
import { kindColors } from '@dead-lines-inc/frontend';

import styles from './board-editor.module.css';

interface DragState {
  kind: number;
  dragged: boolean;
}

export interface BoardEditorProps {
  size: number;
  cells: Cell[];
  onChange: (cells: Cell[]) => void;
}

function findUnusedKind(cells: Cell[]): number {
  const usedKinds = new Set(
    cells.filter((cell) => cell.hasTarget).map((cell) => cell.kind),
  );
  let kind = 1;
  while (usedKinds.has(kind)) {
    kind += 1;
  }
  return kind;
}

// A cell can't hold a target if it shares a row/column with an existing
// target, or is one of its (up to 8) neighbours — mirrors validateBoard's
// row/col/adjacency checks.
function findUnsuitableCells(size: number, cells: Cell[]): Set<number> {
  const unsuitable = new Set<number>();

  cells.forEach((cell, index) => {
    if (!cell.hasTarget) return;
    const targetRow = Math.floor(index / size);
    const targetCol = index % size;

    for (let row = 0; row < size; row++) {
      unsuitable.add(row * size + targetCol);
    }
    for (let col = 0; col < size; col++) {
      unsuitable.add(targetRow * size + col);
    }
    for (let row = targetRow - 1; row <= targetRow + 1; row++) {
      for (let col = targetCol - 1; col <= targetCol + 1; col++) {
        if (row < 0 || row >= size || col < 0 || col >= size) continue;
        unsuitable.add(row * size + col);
      }
    }
  });

  cells.forEach((cell, index) => {
    if (cell.hasTarget) unsuitable.delete(index);
  });

  return unsuitable;
}

export function BoardEditor({ size, cells, onChange }: BoardEditorProps) {
  const dragStateRef = useRef<DragState | null>(null);
  const unsuitableCells = useMemo(
    () => findUnsuitableCells(size, cells),
    [size, cells],
  );

  useEffect(() => {
    const handleWindowMouseUp = () => {
      dragStateRef.current = null;
    };
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, []);

  const handleMouseDown = (
    index: number,
    event: ReactMouseEvent<HTMLTableCellElement>,
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragStateRef.current = { kind: cells[index].kind, dragged: false };
  };

  const handleMouseEnter = (index: number) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;
    dragState.dragged = true;
    if (cells[index].kind === dragState.kind) return;
    const next = cells.slice();
    next[index] = { ...next[index], kind: dragState.kind };
    onChange(next);
  };

  const handleMouseUp = (index: number) => {
    const dragState = dragStateRef.current;
    dragStateRef.current = null;
    if (!dragState || dragState.dragged) return;
    const clicked = cells[index];
    if (clicked.hasTarget) {
      // Removing a target clears its whole kind region, not just the cell.
      onChange(
        cells.map((cell) =>
          cell.kind === clicked.kind
            ? { ...cell, hasTarget: undefined, kind: 0 }
            : cell,
        ),
      );
      return;
    }
    if (unsuitableCells.has(index)) return;
    const next = cells.slice();
    next[index] = { ...clicked, hasTarget: true, kind: findUnusedKind(cells) };
    onChange(next);
  };

  return (
    <table className={styles['grid']}>
      <tbody>
        {Array.from({ length: size }).map((_, row) => (
          <tr key={row}>
            {Array.from({ length: size }).map((_, col) => {
              const index = row * size + col;
              const cell = cells[index];
              return (
                <td
                  key={col}
                  className={styles['cell']}
                  style={{ backgroundColor: kindColors[cell.kind] }}
                  onMouseDown={(event) => handleMouseDown(index, event)}
                  onMouseEnter={() => handleMouseEnter(index)}
                  onMouseUp={() => handleMouseUp(index)}
                >
                  {cell.hasTarget && (
                    <span className={styles['target']}>{cell.kind}</span>
                  )}
                  {!cell.hasTarget && unsuitableCells.has(index) && (
                    <span className={styles['unsuitable']}>✕</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default BoardEditor;
