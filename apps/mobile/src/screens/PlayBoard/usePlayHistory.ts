import { useRef } from 'react';

import { play } from '@dead-lines-inc/common.models';

type PlayAction = play.PlayActionRecord[number];

export interface PlayHistoryController {
  // Builds an action without recording it — for a gesture whose outcome
  // (a real mark toggle vs. the second half of a double tap) isn't known
  // yet. Commit it later with commitAction, or drop it on the floor.
  makeAction(type: play.PlayActionTypeEnum, cellKey: number): PlayAction;
  // Builds and immediately records an action.
  recordAction(type: play.PlayActionTypeEnum, cellKey: number): PlayAction;
  // Records an action built earlier via makeAction, keeping its original
  // timestamp.
  commitAction(action: PlayAction): void;
  // Undoes a previously recorded action — used when a fast second tap turns
  // what looked like a mark toggle into a single "state" action.
  removeAction(action: PlayAction | null): void;
  getHistory(): play.PlayActionRecord;
}

// Every mark/unmark/state action the player takes, timestamped against play
// time via getElapsedMs — submitted alongside the finished play's stats.
export function usePlayHistory(getElapsedMs: () => number): PlayHistoryController {
  const historyRef = useRef<play.PlayActionRecord>([]);

  const makeAction = (type: play.PlayActionTypeEnum, cellKey: number): PlayAction => ({
    timeMs: getElapsedMs(),
    type,
    cellKey,
  });

  const commitAction = (action: PlayAction) => {
    historyRef.current.push(action);
  };

  const recordAction = (type: play.PlayActionTypeEnum, cellKey: number): PlayAction => {
    const action = makeAction(type, cellKey);
    commitAction(action);
    return action;
  };

  const removeAction = (action: PlayAction | null) => {
    if (!action) return;
    const index = historyRef.current.indexOf(action);
    if (index !== -1) historyRef.current.splice(index, 1);
  };

  return {
    makeAction,
    recordAction,
    commitAction,
    removeAction,
    getHistory: () => historyRef.current,
  };
}
