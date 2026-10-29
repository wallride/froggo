import { useEffect, useMemo, useState } from 'react';

import type { PlayBoard, PlayCell } from '@dead-lines-inc/common.models';

import type { TutorialAction, TutorialStep } from './tutorial-script';

// Before a step's first action, between actions, and before it starts over.
const START_DELAY_MS = 600;
const ACTION_INTERVAL_MS = 700;
const REPLAY_DELAY_MS = 1800;

// A tap being shown on the board. `id` changes with every tap, so the same
// cell tapped twice in a row shows twice.
export interface TutorialTap {
  id: number;
  index: number;
  double: boolean;
}

function applyAction(cells: PlayCell[], action: TutorialAction, size: number): PlayCell[] {
  if (!('tap' in action)) return cells;
  const index = action.at[0] * size + action.at[1];
  const cell = cells[index];
  if (cell.isStated) return cells;

  const next = cells.slice();
  next[index] =
    action.tap === 'single'
      ? { ...cell, isMarked: !cell.isMarked }
      : { ...cell, isStated: true, isMarked: false };
  return next;
}

// Plays the step's actions on the board, as the steps before it left it,
// over and over while it's shown. Steps with no actions just show the board.
export function useTutorialPlayback(
  board: PlayBoard,
  steps: TutorialStep[],
  stepIndex: number,
): { cells: PlayCell[]; tap: TutorialTap | null } {
  const startCells = useMemo(
    () =>
      steps
        .slice(0, stepIndex)
        .flatMap((step) => step.actions)
        .reduce((cells, action) => applyAction(cells, action, board.size), board.cells),
    [board, steps, stepIndex],
  );
  const [cells, setCells] = useState(startCells);
  const [tap, setTap] = useState<TutorialTap | null>(null);

  useEffect(() => {
    const { actions } = steps[stepIndex];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let tapId = 0;

    const play = () => {
      setCells(startCells);
      setTap(null);
      let at = START_DELAY_MS;
      for (const action of actions) {
        if ('pause' in action) {
          at += action.pause;
          continue;
        }
        timers.push(
          setTimeout(() => {
            setTap({
              id: ++tapId,
              index: action.at[0] * board.size + action.at[1],
              double: action.tap === 'double',
            });
            setCells((current) => applyAction(current, action, board.size));
          }, at),
        );
        at += ACTION_INTERVAL_MS;
      }
      if (actions.length > 0) timers.push(setTimeout(play, at + REPLAY_DELAY_MS));
    };

    play();
    return () => timers.forEach(clearTimeout);
  }, [board, steps, stepIndex, startCells]);

  return { cells, tap };
}
