import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import { IdentifyPlayer, PlayerAuthProviderEnum } from '@froggo/common.models';

import { PlayerAPI } from '../api/player-api';
import { getOrCreateDeviceId } from './device-id';

interface PlayerContextValue {
  player: IdentifyPlayer | null;
  loading: boolean;
  error: string | null;
}

const INITIAL_VALUE: PlayerContextValue = {
  player: null,
  loading: true,
  error: null,
};

const PlayerContext = createContext<PlayerContextValue>(INITIAL_VALUE);

const playerApi = new PlayerAPI();

export function PlayerProvider({ children }: PropsWithChildren) {
  const [value, setValue] = useState<PlayerContextValue>(INITIAL_VALUE);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const deviceId = await getOrCreateDeviceId();
        const player = await playerApi.identify({
          authProvider: PlayerAuthProviderEnum.anonymous,
          externalId: deviceId,
        });
        if (!cancelled) setValue({ player, loading: false, error: null });
      } catch (e) {
        if (!cancelled) {
          setValue({
            player: null,
            loading: false,
            error: e instanceof Error ? e.message : 'Failed to identify player',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  return useContext(PlayerContext);
}
