import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { GestureResponderEvent, PanResponder, View } from 'react-native';

import { PlayBoard as PlayBoardModel, PlayCell, play } from '@dead-lines-inc/common.models';

import { CELL_SPACING } from './boardLayout';
import type { GameState, ScoreGain } from './types';
import { useElapsedPlayTime } from './useElapsedPlayTime';
import { usePlayHistory } from './usePlayHistory';

export const MAX_STARS = 3;
// Quota mode scoring, see handleStatement.
const TARGET_SCORE = 50;
const FREE_CELL_SCORE = 1;
const DOUBLE_TAP_THRESHOLD_MS = 400;
// Auto-marks around a found target go down ring by ring, nearest first, this
// far apart.
const AUTO_MARK_STEP_MS = 100;
// How long after the target is found the first ring goes down.
const AUTO_MARK_DELAY_MS = 1000;

interface DragState {
  mark: boolean;
}

interface LastTouch {
  index: number;
  time: number;
  // The mark toggle this tap recorded (if any), kept so a following double
  // tap can undo it — see handleRelease.
  action: play.PlayActionRecord[number] | null;
}

function toPlayCells(cells: PlayCell[]): PlayCell[] {
  return cells.map((cell) => ({ ...cell, isMarked: false, isStated: false }));
}

export interface BoardGameOptions {
  // Time mode: once a target is found, every cell that can't hold another one
  // (its row, its column, its neighbours and its kind) gets marked for the
  // player.
  autoMarkAroundTargets?: boolean;
  // Accuracy mode: no stars to spend — the first wrong guess loses the board.
  loseOnFirstMistake?: boolean;
}

// The cells sharing a row, a column or a kind with `index`, or touching it,
// on a size×size board — none of which can hold a target if it does — with
// how many steps (rows or columns, whichever is more) each is from it.
function cellsRuledOutBy(
  index: number,
  size: number,
  cells: PlayCell[],
): { index: number; distance: number }[] {
  const row = Math.floor(index / size);
  const col = index % size;
  const ruledOut: { index: number; distance: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const distance = Math.max(Math.abs(r - row), Math.abs(c - col));
      if (distance === 0) continue;
      const sameKind = cells[r * size + c].kind === cells[index].kind;
      if (r === row || c === col || distance === 1 || sameKind) {
        ruledOut.push({ index: r * size + c, distance });
      }
    }
  }
  return ruledOut;
}

// `cells` with the still untouched ones of `ring` marked, or null if none are.
function cellsRuledOutRingMarked(cells: PlayCell[], ring: number[]): PlayCell[] | null {
  const toMark = ring.filter((i) => !cells[i].isStated && !cells[i].isMarked);
  if (toMark.length === 0) return null;
  const next = cells.slice();
  for (const i of toMark) next[i] = { ...next[i], isMarked: true };
  return next;
}

export interface BoardGame {
  cells: PlayCell[];
  gameState: GameState;
  stars: number;
  score: number;
  // One entry per found target, in order — the score's history, for animating it.
  scoreGains: ScoreGain[];
  foundTargets: number;
  totalTargets: number;
  elapsedSeconds: number;
  getElapsedMs: () => number;
  getHistory: () => play.PlayActionRecord;
  gridRef: RefObject<View | null>;
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];
  onGridLayout: () => void;
}

// Owns the interactive core of a play session: the cell grid, tap/drag/
// double-tap gesture recognition, and scoring/stars — plus, composed here
// rather than at the call site, the elapsed-time and action-history
// instrumentation that hangs off the exact same gameState/cells lifecycle.
export function useBoardGame(
  board: PlayBoardModel,
  cellSize: number,
  { autoMarkAroundTargets = false, loseOnFirstMistake = false }: BoardGameOptions = {},
): BoardGame {
  const [cells, setCells] = useState<PlayCell[]>(() => toPlayCells(board.cells));
  const [stars, setStars] = useState(MAX_STARS);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [score, setScore] = useState(0);
  const [scoreGains, setScoreGains] = useState<ScoreGain[]>([]);

  const { elapsedSeconds, getElapsedMs } = useElapsedPlayTime(gameState === 'playing');
  const history = usePlayHistory(getElapsedMs);

  // Mutable mirrors of the above so the PanResponder callbacks (created
  // once, closing over stale state otherwise) always see current values.
  const cellsRef = useRef(cells);
  cellsRef.current = cells;
  const starsRef = useRef(stars);
  starsRef.current = stars;
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const scoreRef = useRef(score);
  scoreRef.current = score;

  const dragStateRef = useRef<DragState | null>(null);
  // Only ever holds a completed *stationary* tap (see handleRelease) — a
  // drag is never recorded here, so it can't combine with a later tap or
  // drag to misfire as a double-tap.
  const lastTapRef = useRef<LastTouch | null>(null);
  const gridOriginRef = useRef({ x: 0, y: 0 });
  const gridRef = useRef<View>(null);
  // Tracks whether the current gesture has moved across cells, resolved at
  // release to tell a genuine drag apart from a stationary tap.
  const dragStartIndexRef = useRef<number | null>(null);
  const didDragRef = useRef(false);
  // A stationary tap's mark toggle isn't committed right away — a fast
  // second tap on the same cell resolves the pair into a single "state"
  // action instead, and neither tap's toggle should show up in history when
  // that happens. Held here until release knows whether this gesture is a
  // genuine tap (commit it) or the second half of a double tap (discard it,
  // along with the previous tap's already-committed one — see
  // LastTouch.action).
  const pendingTapActionRef = useRef<play.PlayActionRecord[number] | null>(null);

  const totalTargets = useMemo(
    () => board.cells.filter((cell) => cell.hasTarget).length,
    [board],
  );

  const foundTargets = useMemo(
    () => cells.filter((cell) => cell.hasTarget && cell.isStated).length,
    [cells],
  );

  const autoMarkTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => autoMarkTimersRef.current.forEach(clearTimeout), []);

  // Marks the cells a found target rules out, AUTO_MARK_DELAY_MS after it's
  // found, a ring at a time, nearest first. Each ring is applied to the board as it stands by then, so a cell
  // the player has opened or marked in the meantime is left alone. Not
  // recorded in history: these marks are the game's, not the player's, and
  // mustn't count towards marksUsed.
  const scheduleAutoMarks = (targetIndex: number) => {
    const rings = new Map<number, number[]>();
    for (const { index, distance } of cellsRuledOutBy(targetIndex, board.size, cellsRef.current)) {
      rings.set(distance, [...(rings.get(distance) ?? []), index]);
    }
    for (const [distance, ring] of rings) {
      const timer = setTimeout(() => {
        const next = cellsRuledOutRingMarked(cellsRef.current, ring);
        if (!next) return;
        // Synchronously, like the gesture handlers — see handleGrant.
        cellsRef.current = next;
        setCells(next);
      }, AUTO_MARK_DELAY_MS + (distance - 1) * AUTO_MARK_STEP_MS);
      autoMarkTimersRef.current.push(timer);
    }
  };

  const handleStatement = (index: number) => {
    const cell = cellsRef.current[index];
    if (cell.isStated) return;

    const next = cellsRef.current.slice();
    next[index] = { ...cell, isStated: true, isMarked: false };
    if (cell.hasTarget && autoMarkAroundTargets) scheduleAutoMarks(index);
    // Written synchronously, not just via setCells — see the comment on
    // handleGrant below for why cellsRef can't rely on React's render
    // cycle to stay current between/within touch events.
    cellsRef.current = next;
    setCells(next);
    history.recordAction(play.PlayActionTypeEnum.state, cell.key);

    if (cell.hasTarget) {
      // Quota mode: starts at 0, and each found target adds 50 plus however
      // many cells are still free at that moment — neither marked nor
      // already stated (found souls and wrong guesses, and this very find,
      // are settled cells that score nothing). A running total rather than
      // something re-derived from the current board, since later clicks must
      // not change what an earlier find already earned.
      const freeCells: number[] = [];
      next.forEach((c, i) => {
        if (!c.isMarked && !c.isStated) freeCells.push(i);
      });
      const nextScore =
        scoreRef.current + TARGET_SCORE + freeCells.length * FREE_CELL_SCORE;
      scoreRef.current = nextScore;
      setScore(nextScore);
      setScoreGains((gains) => [
        ...gains,
        {
          targetCell: index,
          targetPoints: TARGET_SCORE,
          freeCells,
          pointsPerFreeCell: FREE_CELL_SCORE,
        },
      ]);

      const targetsFound = next.filter(
        (c) => c.hasTarget && c.isStated,
      ).length;
      if (targetsFound === totalTargets) {
        setGameState('won');
      }
    } else if (loseOnFirstMistake) {
      setGameState('lost');
    } else {
      const nextStars = starsRef.current - 1;
      setStars(nextStars);
      if (nextStars <= 0) {
        setGameState('lost');
      }
    }
  };

  const indexFromPage = (pageX: number, pageY: number): number | null => {
    // Each cell's on-screen footprint includes its margin on both sides —
    // dividing by cellSize alone drifts from the real cell boundaries as
    // col/row grows, occasionally resolving a touch to the wrong cell.
    const cellFootprint = cellSize + CELL_SPACING;
    const col = Math.floor((pageX - gridOriginRef.current.x) / cellFootprint);
    const row = Math.floor((pageY - gridOriginRef.current.y) / cellFootprint);
    if (col < 0 || col >= board.size || row < 0 || row >= board.size) {
      return null;
    }
    return row * board.size + col;
  };

  // Double-tap can only be told apart from "the start of a drag" once the
  // gesture is over — deciding it at touch-down (as a first-tap-vs-second-
  // tap timing check) meant ANY gesture starting on a cell that had just
  // been tapped (not even necessarily dragged) got misread as the second
  // tap of a double-tap, calling handleStatement and skipping drag setup
  // entirely — so a drag starting right after an ordinary tap on the same
  // cell silently did nothing beyond that first cell. Instead, grant always
  // sets up marking/dragging unconditionally, and double-tap is resolved on
  // release, once we actually know whether this gesture stayed put.
  const handleGrant = (event: GestureResponderEvent) => {
    pendingTapActionRef.current = null;

    if (gameStateRef.current !== 'playing') {
      dragStartIndexRef.current = null;
      return;
    }
    const { pageX, pageY } = event.nativeEvent;
    const index = indexFromPage(pageX, pageY);
    if (index === null) {
      dragStartIndexRef.current = null;
      return;
    }

    dragStartIndexRef.current = index;
    didDragRef.current = false;

    const cell = cellsRef.current[index];
    if (cell.isStated) return;

    const nextMark = !cell.isMarked;
    dragStateRef.current = { mark: nextMark };

    // Written synchronously to cellsRef, not just via setCells: a fresh
    // press can land right after the previous gesture's release, before
    // React has re-rendered (which is the only thing that normally
    // resyncs cellsRef from `cells` state) — reading a stale cellsRef
    // here would compute nextMark from the pre-previous-gesture value.
    const next = cellsRef.current.slice();
    next[index] = { ...cell, isMarked: nextMark };
    cellsRef.current = next;
    setCells(next);
    // Buffered, not recorded — see pendingTapActionRef.
    pendingTapActionRef.current = history.makeAction(
      nextMark ? play.PlayActionTypeEnum.setMark : play.PlayActionTypeEnum.unsetMark,
      cell.key,
    );
  };

  const handleMove = (event: GestureResponderEvent) => {
    const dragState = dragStateRef.current;
    if (!dragState || gameStateRef.current !== 'playing') return;

    const { pageX, pageY } = event.nativeEvent;
    const index = indexFromPage(pageX, pageY);
    if (index === null) return;

    if (index !== dragStartIndexRef.current && !didDragRef.current) {
      didDragRef.current = true;
      // Confirmed as a real drag, not a stationary tap: the starting
      // cell's buffered toggle actually happened and should be recorded.
      if (pendingTapActionRef.current) {
        history.commitAction(pendingTapActionRef.current);
        pendingTapActionRef.current = null;
      }
    }

    const cell = cellsRef.current[index];
    if (cell.isStated || cell.isMarked === dragState.mark) return;

    // Same reasoning as handleGrant: several move events from a fast drag
    // can fire before React re-renders between them, so cellsRef has to be
    // kept current by hand rather than relying on that render to do it.
    const next = cellsRef.current.slice();
    next[index] = { ...cell, isMarked: dragState.mark };
    cellsRef.current = next;
    setCells(next);
    history.recordAction(
      dragState.mark ? play.PlayActionTypeEnum.setMark : play.PlayActionTypeEnum.unsetMark,
      cell.key,
    );
  };

  const handleRelease = () => {
    dragStateRef.current = null;

    const index = dragStartIndexRef.current;
    dragStartIndexRef.current = null;
    // A real drag isn't half of a double-tap — only a gesture that stayed
    // on its starting cell the whole time counts as a "tap" here. Its
    // toggle was already committed in handleMove once the drag was
    // confirmed, so there's nothing left pending to discard.
    if (index === null || didDragRef.current) {
      pendingTapActionRef.current = null;
      return;
    }

    const now = Date.now();
    const last = lastTapRef.current;
    const isDoubleTap =
      !!last && last.index === index && now - last.time < DOUBLE_TAP_THRESHOLD_MS;

    if (isDoubleTap) {
      // Neither tap's mark toggle actually happened from the player's
      // point of view — only the resulting "state" action should be
      // recorded, so undo the previous tap's already-committed one and
      // drop this tap's still-buffered one.
      history.removeAction(last.action);
      pendingTapActionRef.current = null;
      lastTapRef.current = null;
      handleStatement(index);
    } else {
      if (pendingTapActionRef.current) {
        history.commitAction(pendingTapActionRef.current);
      }
      lastTapRef.current = { index, time: now, action: pendingTapActionRef.current };
      pendingTapActionRef.current = null;
    }
  };

  // PanResponder.create() only runs once (useRef only keeps its first
  // call's result), so its callbacks would otherwise permanently close
  // over render #1's handleGrant/handleMove — and therefore render #1's
  // cellSize/indexFromPage, which can be wrong on the very first render
  // (the frame's dimensions may be seeded synchronously, then corrected
  // from an effect after mount). Routing through refs updated every
  // render keeps the responder's touch math in sync with what's on
  // screen instead of freezing it to a possibly-stale first render.
  const handleGrantRef = useRef(handleGrant);
  handleGrantRef.current = handleGrant;
  const handleMoveRef = useRef(handleMove);
  handleMoveRef.current = handleMove;
  const handleReleaseRef = useRef(handleRelease);
  handleReleaseRef.current = handleRelease;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => handleGrantRef.current(event),
      onPanResponderMove: (event) => handleMoveRef.current(event),
      onPanResponderRelease: () => handleReleaseRef.current(),
      onPanResponderTerminate: () => handleReleaseRef.current(),
    }),
  ).current;

  const onGridLayout = () => {
    // measure() can briefly return stale values right inside onLayout on
    // some platforms; deferring a tick keeps it reliable.
    setTimeout(() => {
      gridRef.current?.measure((_x, _y, _width, _height, pageX, pageY) => {
        gridOriginRef.current = { x: pageX, y: pageY };
      });
    }, 0);
  };

  return {
    cells,
    gameState,
    stars,
    score,
    scoreGains,
    foundTargets,
    totalTargets,
    elapsedSeconds,
    getElapsedMs,
    getHistory: history.getHistory,
    gridRef,
    panHandlers: panResponder.panHandlers,
    onGridLayout,
  };
}
