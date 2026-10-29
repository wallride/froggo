import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { View } from 'react-native';

import {
  MULTIPLIER_COUNT_MS,
  MULTIPLIER_POP_MS,
  MULTIPLIER_START_DELAY_MS,
  STAR_STAGGER_MS,
} from './scoreAnimation';

// One star on its way to the multiplier. Coordinates are the top-left corner
// of the star, relative to the layer it's drawn in.
export interface StarFlight {
  // Which star this is, counting from the first to fly.
  step: number;
  size: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function measureInWindow(node: View | null | undefined): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!node) return resolve(null);
    node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });
}

interface UseStarMultiplierArgs {
  // On once a won quota play's results are on screen.
  enabled: boolean;
  // The score the play earned, before the multiplier.
  baseScore: number;
  // Stars left at the end: what the multiplier ends up at.
  stars: number;
  // The top bar's stars, in order; the lit ones are the first `stars`.
  starRefs: RefObject<(View | null)[]>;
  multiplierRef: RefObject<View | null>;
  // Measured to place flights, which are positioned relative to this layer.
  layerRef: RefObject<View | null>;
}

export interface StarMultiplier {
  // 0 until the first star lands.
  multiplier: number;
  displayedScore: number;
  flights: StarFlight[];
  onFlightArrived: (flight: StarFlight) => void;
}

// Plays out the end-of-play multiplier: the plain score shows first, then
// copies of the stars left (the top bar keeps its own) take off for the multiplier one after another, last lit one
// first, each landing bumping it by one. Once it's reached the star count,
// the score counts up to baseScore × multiplier in one go.
export function useStarMultiplier({
  enabled,
  baseScore,
  stars,
  starRefs,
  multiplierRef,
  layerRef,
}: UseStarMultiplierArgs): StarMultiplier {
  const [multiplier, setMultiplier] = useState(0);
  // Null until the final count: the plain base score shows until then.
  const [displayedScore, setDisplayedScore] = useState<number | null>(null);
  const [flights, setFlights] = useState<StarFlight[]>([]);

  const aliveRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const later = useCallback((ms: number, run: () => void) => {
    timersRef.current.push(
      setTimeout(() => {
        if (aliveRef.current) run();
      }, ms),
    );
  }, []);

  // Counts the score from `from` up to `to` over MULTIPLIER_COUNT_MS.
  const countTo = useCallback((from: number, to: number) => {
    const startedAt = Date.now();
    const step = () => {
      if (!aliveRef.current) return;
      const progress = Math.min(1, (Date.now() - startedAt) / MULTIPLIER_COUNT_MS);
      setDisplayedScore(Math.round(from + (to - from) * progress));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, []);

  const landedRef = useRef(0);
  const land = useCallback(() => {
    const landed = ++landedRef.current;
    setMultiplier(landed);
    // The last star in: once its pop settles, the score takes the multiplier.
    if (landed === stars) {
      later(MULTIPLIER_POP_MS * 2, () => countTo(baseScore, baseScore * stars));
    }
  }, [baseScore, stars, later, countTo]);

  const launch = useCallback(
    async (step: number) => {
      const [star, target, layer] = await Promise.all([
        measureInWindow(starRefs.current[stars - 1 - step]),
        measureInWindow(multiplierRef.current),
        measureInWindow(layerRef.current),
      ]);
      if (!aliveRef.current) return;
      if (!star || !target || !layer) {
        // Can't tell where anything is — skip the flight, keep the numbers right.
        land();
        return;
      }
      const flight = {
        step,
        size: star.width,
        fromX: star.x - layer.x,
        fromY: star.y - layer.y,
        toX: target.x + target.width / 2 - star.width / 2 - layer.x,
        toY: target.y + target.height / 2 - star.height / 2 - layer.y,
      };
      setFlights((current) => [...current, flight]);
    },
    [stars, starRefs, multiplierRef, layerRef, land],
  );

  const startedRef = useRef(false);
  useEffect(() => {
    if (!enabled || startedRef.current || stars <= 0) return;
    startedRef.current = true;
    for (let step = 0; step < stars; step++) {
      later(MULTIPLIER_START_DELAY_MS + step * STAR_STAGGER_MS, () => launch(step));
    }
  }, [enabled, stars, later, launch]);

  const onFlightArrived = useCallback(
    (arrived: StarFlight) => {
      if (!aliveRef.current) return;
      setFlights((current) => current.filter((flight) => flight.step !== arrived.step));
      land();
    },
    [land],
  );

  return {
    multiplier,
    displayedScore: enabled && displayedScore !== null ? displayedScore : baseScore,
    flights,
    onFlightArrived,
  };
}
