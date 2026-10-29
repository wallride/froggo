// The timeline is an axis of seconds from 0 to its timeframe: the slowest time
// among other players' results and the player's own, but never less than this.
export const MIN_TIMEFRAME_MS = 60 * 1000;

// Ticks go every 10 seconds; when they'd be packed tighter than
// MIN_TICK_SPACING_PX, the next interval up is used instead.
const TICK_INTERVALS_MS = [10, 20, 30, 60].map((seconds) => seconds * 1000);
const MIN_TICK_SPACING_PX = 20;

// Another player's time on the same footing as the player's own.
export interface TimelineResult {
  id: string;
  timeMs: number;
}

// Grows with the player's time once it passes everyone else's, so the axis
// rescales instead of the player running off its end.
export function timelineTimeframeMs(elapsedMs: number, results: TimelineResult[]): number {
  return results.reduce(
    (max, result) => Math.max(max, result.timeMs),
    Math.max(MIN_TIMEFRAME_MS, elapsedMs),
  );
}

// Times (from 0) of the ticks on an axis of timeframeMs drawn axisWidthPx wide.
export function timelineTicksMs(timeframeMs: number, axisWidthPx: number): number[] {
  const intervalMs =
    TICK_INTERVALS_MS.find(
      (interval) => (interval / timeframeMs) * axisWidthPx >= MIN_TICK_SPACING_PX,
    ) ?? TICK_INTERVALS_MS[TICK_INTERVALS_MS.length - 1];

  const ticks: number[] = [];
  for (let timeMs = 0; timeMs <= timeframeMs; timeMs += intervalMs) ticks.push(timeMs);
  return ticks;
}
