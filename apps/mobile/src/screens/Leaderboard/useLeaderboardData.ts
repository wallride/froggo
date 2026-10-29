import { useEffect, useState } from 'react';

import type { GetLeaderboardResponse } from '@dead-lines-inc/common.api.mobile';

import { useApis } from '../../api/use-apis';

export interface LeaderboardData {
  result: GetLeaderboardResponse | null;
  error: string | null;
}

// Fetches the challenge's leaderboard as it stands right now — the "after
// this play" snapshot, diffed against the previousLeaderboard nav param to
// animate what changed.
export function useLeaderboardData(challengeId: string): LeaderboardData {
  const { playApi } = useApis();
  const [result, setResult] = useState<GetLeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    playApi
      .getLeaderboard({ challengeId })
      .then((loaded) => {
        if (!cancelled) setResult(loaded);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load leaderboard');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [playApi, challengeId]);

  return { result, error };
}
