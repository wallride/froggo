import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export interface ElapsedPlayTime {
  elapsedSeconds: number;
  getElapsedMs: () => number;
}

// Ticks once a second while `isRunning`, then freezes when it stops — the
// frozen value doubles as a final result (e.g. time mode's score). Also
// pauses while the app is backgrounded/inactive: accumulatedMsRef banks the
// time clocked before the app went away, and activeStartRef (null while
// paused) marks when the current active stretch began, so backgrounded time
// never gets counted once the app returns to the foreground.
export function useElapsedPlayTime(isRunning: boolean): ElapsedPlayTime {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const accumulatedMsRef = useRef(0);
  const activeStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) {
      // Bank the stretch that was running, the same as when the app goes to
      // the background — dropping it would reset the final time to whatever
      // had been banked before (usually 0). The displayed seconds catch up
      // too, since the last tick can be up to a second behind.
      if (activeStartRef.current !== null) {
        accumulatedMsRef.current += Date.now() - activeStartRef.current;
        activeStartRef.current = null;
        setElapsedSeconds(Math.floor(accumulatedMsRef.current / 1000));
      }
      return;
    }

    activeStartRef.current = Date.now();

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        activeStartRef.current = Date.now();
      } else if (activeStartRef.current !== null) {
        accumulatedMsRef.current += Date.now() - activeStartRef.current;
        activeStartRef.current = null;
      }
    });

    const interval = setInterval(() => {
      if (activeStartRef.current === null) return;
      setElapsedSeconds(
        Math.floor((accumulatedMsRef.current + Date.now() - activeStartRef.current) / 1000),
      );
    }, 1000);

    return () => {
      appStateSubscription.remove();
      clearInterval(interval);
    };
  }, [isRunning]);

  // Same active-time accounting as the ticking effect above, but read
  // on-demand for recording a history action's timestamp precisely instead
  // of waiting for the next whole-second tick.
  const getElapsedMs = () =>
    accumulatedMsRef.current +
    (activeStartRef.current !== null ? Date.now() - activeStartRef.current : 0);

  return { elapsedSeconds, getElapsedMs };
}
