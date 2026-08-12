import { MouseEvent as ReactMouseEvent, useEffect, useRef } from 'react';

import { Cell } from '@froggo/common.models';
import { kindColors } from '@froggo/frontend';

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

export function BoardEditor({ size, cells, onChange }: BoardEditorProps) {
  const dragStateRef = useRef<DragState | null>(null);

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
    const next = cells.slice();
    next[index] = clicked.hasTarget
      ? { ...clicked, hasTarget: undefined, kind: 0 }
      : { ...clicked, hasTarget: true, kind: findUnusedKind(cells) };
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
                  <span
                    className={cell.hasTarget ? styles['target'] : undefined}
                  >
                    {cell.kind}
                  </span>
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
