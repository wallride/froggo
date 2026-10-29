import { useMemo } from 'react';

import { useConfiguration } from '../configuration/configuration-context';
import { PlayAPI } from './play-api';
import { PlayerAPI } from './player-api';

// API clients bound to the loaded configuration's addresses and routes.
export function useApis(): { playApi: PlayAPI; playerApi: PlayerAPI } {
  const { api } = useConfiguration();
  return useMemo(
    () => ({ playApi: new PlayAPI(api), playerApi: new PlayerAPI(api) }),
    [api],
  );
}
