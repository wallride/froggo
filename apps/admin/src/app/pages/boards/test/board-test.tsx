import {
  MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Board, PlayCell } from '@dead-lines-inc/common.models';
import { kindColors } from '@dead-lines-inc/frontend';

import { useApi } from '../../../../api/api-context';
import styles from './board-test.module.css';

type GameState = 'playing' | 'won' | 'lost';

interface DragState {
  mark: boolean;
}

interface LastMouseDown {
  index: number;
  time: number;
}

const MAX_STARS = 3;
const DOUBLE_CLICK_THRESHOLD_MS = 400;

function toPlayCells(board: Board): PlayCell[] {
  return board.cells.map((cell) => ({
    ...cell,
    isMarked: false,
    isStated: false,
  }));
}

export function BoardTest() {
  const [searchParams] = useSearchParams();
  const { boards: boardApi } = useApi();

  const id = searchParams.get('id');

  const [board, setBoard] = useState<Board | null>();
  const [cells, setCells] = useState<PlayCell[]>([]);
  const [stars, setStars] = useState(MAX_STARS);
  const [gameState, setGameState] = useState<GameState>('playing');

  const dragStateRef = useRef<DragState | null>(null);
  const lastMouseDownRef = useRef<LastMouseDown | null>(null);

  useEffect(() => {
    if (!id) {
      setBoard(null);
      return;
    }
    boardApi
      .getById(id)
      .then((found) => {
        setBoard(found);
        setCells(toPlayCells(found));
        setStars(MAX_STARS);
        setGameState('playing');
      })
      .catch(() => setBoard(null));
  }, [boardApi, id]);

  useEffect(() => {
    const handleWindowMouseUp = () => {
      dragStateRef.current = null;
    };
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, []);

  const totalTargets = useMemo(
    () => (board ? board.cells.filter((cell) => cell.hasTarget).length : 0),
    [board],
  );

  if (board === undefined) {
    return <p>Loading...</p>;
  }

  if (board === null) {
    return <p>Board not found.</p>;
  }

  const handleReset = () => {
    setCells(toPlayCells(board));
    setStars(MAX_STARS);
    setGameState('playing');
    dragStateRef.current = null;
    lastMouseDownRef.current = null;
  };

  const handleStatement = (index: number) => {
    const cell = cells[index];
    if (cell.isStated) return;

    const next = cells.slice();
    next[index] = { ...cell, isStated: true, isMarked: false };
    setCells(next);

    if (cell.hasTarget) {
      const targetsFound = next.filter(
        (c) => c.hasTarget && c.isStated,
      ).length;
      if (targetsFound === totalTargets) {
        setGameState('won');
      }
    } else {
      const nextStars = stars - 1;
      setStars(nextStars);
      if (nextStars <= 0) {
        setGameState('lost');
      }
    }
  };

  const handleMouseDown = (
    index: number,
    event: ReactMouseEvent<HTMLTableCellElement>,
  ) => {
    if (gameState !== 'playing') return;
    if (event.button !== 0) return;
    event.preventDefault();

    // Double-click detection is done manually via mousedown timing rather
    // than the native click event's `detail` field: relying on the
    // browser's own double-click grouping was unreliable here (each press
    // toggling the mark immediately means a "failed" double-click just
    // reads as two independent mark toggles instead of a statement).
    const now = Date.now();
    const last = lastMouseDownRef.current;
    const isDoubleClick =
      !!last &&
      last.index === index &&
      now - last.time < DOUBLE_CLICK_THRESHOLD_MS;

    if (isDoubleClick) {
      lastMouseDownRef.current = null;
      handleStatement(index);
      return;
    }

    lastMouseDownRef.current = { index, time: now };

    setCells((prev) => {
      const cell = prev[index];
      if (cell.isStated) return prev;

      const nextMark = !cell.isMarked;
      dragStateRef.current = { mark: nextMark };

      const next = prev.slice();
      next[index] = { ...cell, isMarked: nextMark };
      return next;
    });
  };

  const handleMouseEnter = (index: number) => {
    const dragState = dragStateRef.current;
    if (!dragState || gameState !== 'playing') return;

    setCells((prev) => {
      const cell = prev[index];
      if (cell.isStated || cell.isMarked === dragState.mark) return prev;

      const next = prev.slice();
      next[index] = { ...cell, isMarked: dragState.mark };
      return next;
    });
  };

  return (
    <div>
      <h1>
        Test board (${board.id} {board.size}x{board.size})
      </h1>
      <Link to={`/boards/edit?id=${board.id}`}>Edit</Link>
      <div className={styles['stars']}>
        {Array.from({ length: MAX_STARS }).map((_, i) => (
          <span key={i} className={styles['star']}>
            {i < stars ? '★' : '☆'}
          </span>
        ))}
      </div>
      {gameState === 'won' && <p className={styles['won']}>You win!</p>}
      {gameState === 'lost' && <p className={styles['lost']}>Game over</p>}
      <table className={styles['grid']}>
        <tbody>
          {Array.from({ length: board.size }).map((_, row) => (
            <tr key={row}>
              {Array.from({ length: board.size }).map((_, col) => {
                const index = row * board.size + col;
                const cell = cells[index];
                return (
                  <td
                    key={col}
                    className={styles['cell']}
                    style={{ backgroundColor: kindColors[cell.kind] }}
                    onMouseDown={(event) => handleMouseDown(index, event)}
                    onMouseEnter={() => handleMouseEnter(index)}
                  >
                    {cell.isStated && cell.hasTarget && cell.kind}
                    {cell.isStated && !cell.hasTarget && (
                      <span className={styles['wrong']}>✕</span>
                    )}
                    {!cell.isStated && cell.isMarked && (
                      <span className={styles['mark']}>✕</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={handleReset}>
        Reset
      </button>
    </div>
  );
}

export default BoardTest;
