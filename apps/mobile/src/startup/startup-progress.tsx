import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { preloadBundledImages } from './preload-images';

// Everything the app waits for at start, before the first screen is shown.
// Some run one after another (fonts → configuration → player → home screen
// data), the image downloads alongside them.
export type StartupStage =
  | 'fonts'
  | 'images' // bundled images
  | 'configuration'
  | 'avatars' // avatar images, from the API
  | 'player' // identification
  | 'home'; // the home screen's data

// How much of the progress bar each stage takes, roughly by how long it
// tends to take.
const STAGE_WEIGHTS: Record<StartupStage, number> = {
  fonts: 1,
  images: 2,
  configuration: 1,
  avatars: 2,
  player: 1,
  home: 1,
};

const STAGES = Object.keys(STAGE_WEIGHTS) as StartupStage[];
const TOTAL_WEIGHT = STAGES.reduce((sum, stage) => sum + STAGE_WEIGHTS[stage], 0);

interface StartupProgressValue {
  // 0..1 over all stages.
  progress: number;
  // Every stage is through: the app can be shown.
  done: boolean;
  // Why the start is stuck, if it is.
  error: string | null;
  // How far a stage is, 0..1. A stage never goes back. Stable, like
  // reportError.
  report: (stage: StartupStage, fraction: number) => void;
  // A stage has failed, or recovered (null). `retry` starts the stage over.
  reportError: (stage: StartupStage, error: string | null, retry?: () => void) => void;
  // Starts the failed stages over.
  retry: () => void;
}

const StartupProgressContext = createContext<StartupProgressValue>({
  progress: 1,
  done: true,
  error: null,
  report: () => undefined,
  reportError: () => undefined,
  retry: () => undefined,
});

const INITIAL_FRACTIONS = Object.fromEntries(STAGES.map((stage) => [stage, 0])) as Record<
  StartupStage,
  number
>;

// Tracks the start of the app, for the startup screen. Reports made once
// it's done are ignored — the same code runs again later (a reload of the
// home screen) without anything to show for it.
export function StartupProgressProvider({ children }: PropsWithChildren) {
  const [fractions, setFractions] = useState(INITIAL_FRACTIONS);
  const [errors, setErrors] = useState<Partial<Record<StartupStage, string>>>({});
  const retries = useRef<Partial<Record<StartupStage, () => void>>>({});

  const done = STAGES.every((stage) => fractions[stage] >= 1);
  const doneRef = useRef(done);
  doneRef.current = done;

  const report = useCallback((stage: StartupStage, fraction: number) => {
    if (doneRef.current) return;
    setFractions((current) =>
      fraction > current[stage] ? { ...current, [stage]: Math.min(fraction, 1) } : current,
    );
  }, []);

  const reportError = useCallback((stage: StartupStage, error: string | null, retry?: () => void) => {
    if (doneRef.current) return;
    if (error && retry) retries.current[stage] = retry;
    else delete retries.current[stage];
    setErrors((current) => {
      if ((current[stage] ?? null) === error) return current;
      const next = { ...current };
      if (error) next[stage] = error;
      else delete next[stage];
      return next;
    });
  }, []);

  // Each failed stage clears its error once it starts over, which is what
  // takes the error (and the retry button) off the screen.
  const retry = useCallback(() => {
    Object.values(retries.current).forEach((retryStage) => retryStage());
  }, []);

  // Bundled images don't depend on anything, so they're loaded right away.
  useEffect(() => {
    preloadBundledImages((fraction) => report('images', fraction));
  }, [report]);

  const value = useMemo(() => {
    const weighted = STAGES.reduce(
      (sum, stage) => sum + STAGE_WEIGHTS[stage] * fractions[stage],
      0,
    );
    return {
      progress: weighted / TOTAL_WEIGHT,
      done,
      error: done ? null : (STAGES.map((stage) => errors[stage]).find(Boolean) ?? null),
      report,
      reportError,
      retry,
    };
  }, [fractions, errors, done, report, reportError, retry]);

  return (
    <StartupProgressContext.Provider value={value}>{children}</StartupProgressContext.Provider>
  );
}

export function useStartupProgress(): StartupProgressValue {
  return useContext(StartupProgressContext);
}

// Reports a stage that is either not done or done, from a component that
// waits for it. `retry` starts the stage over after an error; it must clear
// the error then.
export function useStartupStage(
  stage: StartupStage,
  isDone: boolean,
  error: string | null = null,
  retry?: () => void,
) {
  const { report, reportError } = useStartupProgress();

  useEffect(() => {
    if (isDone) report(stage, 1);
  }, [stage, isDone, report]);

  useEffect(() => {
    reportError(stage, error, retry);
  }, [stage, error, retry, reportError]);
}
