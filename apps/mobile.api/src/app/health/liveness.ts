const STARTED_AT = new Date();

/**
 * Reported, never enforced: the liveness answer stays 200 even when MongoDB is
 * unreachable, but the field says which of the two the process is in.
 */
export type DatabaseState = 'connected' | 'disconnected' | 'unknown';

export interface Liveness {
  status: 'ok';
  database: DatabaseState;
  /** Seconds since the process started: a small number means it restarted. */
  uptime: number;
  startedAt: string;
}

// One payload for every liveness route ("/", "/health", "/api/health"), so the
// platform's probes and a human checking uptime see the same thing.
export function liveness(database: DatabaseState = 'unknown'): Liveness {
  return {
    status: 'ok',
    database,
    uptime: Math.round(process.uptime()),
    startedAt: STARTED_AT.toISOString(),
  };
}
