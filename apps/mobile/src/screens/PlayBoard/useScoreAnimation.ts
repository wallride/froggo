import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { View } from 'react-native';

import { CELL_MARGIN, CELL_SPACING } from './boardLayout';
import { FLIGHT_STAGGER_MS, SCORE_COUNT_MS } from './scoreAnimation';
import { REVEAL_MS } from './targetReveal';
import type { ScoreGain } from './types';

// A clone of a free cell on its way to the score counter. Coordinates are
// the top-left corner of the clone, relative to the flights layer.
export interface ScoreFlight {
  key: string;
  gainId: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  delayMs: number;
}

// A "+X" over a cell that earned points. x/y are the cell's top-left corner,
// relative to the flights layer.
export interface ScorePopup {
  key: string;
  x: number;
  y: number;
  points: number;
  // The target's popup is drawn bigger than a free cell's.
  isTarget: boolean;
  delayMs: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function measureInWindow(ref: RefObject<View | null>): Promise<Rect | null> {
  return new Promise((resolve) => {
    const node = ref.current;
    if (!node) return resolve(null);
    node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });
}

interface UseScoreAnimationArgs {
  // Off outside quota mode, where there's no score to animate.
  enabled: boolean;
  gains: ScoreGain[];
  // The real score. What's displayed always ends up at it.
  score: number;
  boardSize: number;
  cellSize: number;
  gridRef: RefObject<View | null>;
  scoreChipRef: RefObject<View | null>;
  layerRef: RefObject<View | null>;
}

export interface ScoreAnimation {
  displayedScore: number;
  flights: ScoreFlight[];
  onFlightArrived: (flight: ScoreFlight) => void;
  popups: ScorePopup[];
  onPopupDone: (popup: ScorePopup) => void;
  // True from the moment a target is found until its last clone has landed.
  isAnimating: boolean;
}

// Plays each found target's gain out on the displayed score, apart from the
// real one (which the game — and the results submission — already has in
// full): once the soul has finished appearing (REVEAL_MS), the counter climbs by the target's points over SCORE_COUNT_MS,
// then a clone of every free cell takes off, FLIGHT_STAGGER_MS after the
// previous one, and adds its point to the counter as it lands. A "+X" pops
// up over the target as its count-up starts, and over each free cell as its
// clone takes off.
//
// Every step only ever adds to the displayed score, so gains found while an
// earlier one is still playing simply run alongside it.
export function useScoreAnimation({
  enabled,
  gains,
  score,
  boardSize,
  cellSize,
  gridRef,
  scoreChipRef,
  layerRef,
}: UseScoreAnimationArgs): ScoreAnimation {
  const [displayed, setDisplayed] = useState(0);
  const [flights, setFlights] = useState<ScoreFlight[]>([]);
  const [popups, setPopups] = useState<ScorePopup[]>([]);
  const [finishedGains, setFinishedGains] = useState(0);

  const startedGainsRef = useRef(0);
  // Per gain: clones still in the air, and what each adds when it lands.
  const airborneRef = useRef(new Map<number, { count: number; points: number }>());
  const aliveRef = useRef(true);
  // Read when a gain starts, not when it's found, hence in a ref.
  const cellSizeRef = useRef(cellSize);
  cellSizeRef.current = cellSize;
  const boardSizeRef = useRef(boardSize);
  boardSizeRef.current = boardSize;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const finishGain = useCallback(() => {
    if (aliveRef.current) setFinishedGains((count) => count + 1);
  }, []);

  const add = useCallback((points: number) => {
    if (aliveRef.current && points > 0) setDisplayed((value) => value + points);
  }, []);

  // Adds `points` to the displayed score evenly over SCORE_COUNT_MS, starting
  // once the soul that earned them has finished appearing, in whole points,
  // so the sum lands exactly on `points`.
  const countUp = useCallback(
    (points: number, onDone: () => void) => {
      const startedAt = Date.now() + REVEAL_MS;
      let added = 0;
      const step = () => {
        if (!aliveRef.current) return;
        const progress = Math.min(1, Math.max(0, (Date.now() - startedAt) / SCORE_COUNT_MS));
        const reached = Math.round(points * progress);
        add(reached - added);
        added = reached;
        if (progress < 1) requestAnimationFrame(step);
        else onDone();
      };
      requestAnimationFrame(step);
    },
    [add],
  );

  // Top-left corner of a board cell, relative to the flights layer.
  const cellOrigin = useCallback((grid: Rect, layer: Rect, cellIndex: number) => {
    const footprint = cellSizeRef.current + CELL_SPACING;
    const columns = boardSizeRef.current;
    return {
      x: grid.x - layer.x + (cellIndex % columns) * footprint + CELL_MARGIN,
      y: grid.y - layer.y + Math.floor(cellIndex / columns) * footprint + CELL_MARGIN,
    };
  }, []);

  // Purely decorative: if the board can't be measured, there's just no popup.
  const popTarget = useCallback(
    async (gainId: number, gain: ScoreGain) => {
      const [grid, layer] = await Promise.all([
        measureInWindow(gridRef),
        measureInWindow(layerRef),
      ]);
      if (!aliveRef.current || !grid || !layer) return;
      setPopups((current) => [
        ...current,
        {
          key: `${gainId}-target`,
          ...cellOrigin(grid, layer, gain.targetCell),
          points: gain.targetPoints,
          isTarget: true,
          // In step with the counter, which waits for the soul to appear.
          delayMs: REVEAL_MS,
        },
      ]);
    },
    [cellOrigin, gridRef, layerRef],
  );

  const launchFlights = useCallback(
    async (gainId: number, gain: ScoreGain) => {
      const [grid, chip, layer] = await Promise.all([
        measureInWindow(gridRef),
        measureInWindow(scoreChipRef),
        measureInWindow(layerRef),
      ]);
      if (!aliveRef.current) return;
      if (!grid || !chip || !layer) {
        // Can't tell where anything is — skip the show, keep the numbers right.
        add(gain.freeCells.length * gain.pointsPerFreeCell);
        finishGain();
        return;
      }

      const size = cellSizeRef.current;
      const toX = chip.x + chip.width / 2 - size / 2 - layer.x;
      const toY = chip.y + chip.height / 2 - size / 2 - layer.y;

      airborneRef.current.set(gainId, {
        count: gain.freeCells.length,
        points: gain.pointsPerFreeCell,
      });
      const origins = gain.freeCells.map((cellIndex) => cellOrigin(grid, layer, cellIndex));
      setFlights((current) => [
        ...current,
        ...gain.freeCells.map((cellIndex, order) => ({
          key: `${gainId}-${cellIndex}`,
          gainId,
          fromX: origins[order].x,
          fromY: origins[order].y,
          toX,
          toY,
          delayMs: order * FLIGHT_STAGGER_MS,
        })),
      ]);
      setPopups((current) => [
        ...current,
        ...gain.freeCells.map((cellIndex, order) => ({
          key: `${gainId}-${cellIndex}`,
          ...origins[order],
          points: gain.pointsPerFreeCell,
          isTarget: false,
          delayMs: order * FLIGHT_STAGGER_MS,
        })),
      ]);
    },
    [add, cellOrigin, finishGain, gridRef, scoreChipRef, layerRef],
  );

  useEffect(() => {
    if (!enabled) return;
    while (startedGainsRef.current < gains.length) {
      const gainId = startedGainsRef.current++;
      const gain = gains[gainId];
      popTarget(gainId, gain);
      countUp(gain.targetPoints, () => {
        if (gain.freeCells.length === 0) finishGain();
        else launchFlights(gainId, gain);
      });
    }
  }, [enabled, gains, countUp, launchFlights, finishGain, popTarget]);

  const onFlightArrived = useCallback(
    (flight: ScoreFlight) => {
      if (!aliveRef.current) return;
      const airborne = airborneRef.current.get(flight.gainId);
      if (!airborne) return;

      add(airborne.points);
      setFlights((current) => current.filter((f) => f.key !== flight.key));
      airborne.count -= 1;
      if (airborne.count === 0) {
        airborneRef.current.delete(flight.gainId);
        finishGain();
      }
    },
    [add, finishGain],
  );

  const onPopupDone = useCallback((popup: ScorePopup) => {
    if (aliveRef.current) setPopups((current) => current.filter((p) => p.key !== popup.key));
  }, []);

  const isAnimating = enabled && finishedGains < gains.length;

  // Whatever went astray along the way, settle on the real score at the end.
  useEffect(() => {
    if (enabled && !isAnimating) setDisplayed(score);
  }, [enabled, isAnimating, score]);

  return {
    displayedScore: enabled ? displayed : score,
    flights,
    onFlightArrived,
    popups,
    onPopupDone,
    isAnimating,
  };
}
