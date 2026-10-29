import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { IdentifyPlayerRequest } from '@dead-lines-inc/common.api.mobile';
import { IdentifyPlayer, PlayerAuthProviderEnum, PlayerAvatars } from '@dead-lines-inc/common.models';

import { authSession } from '../api/auth-session';
import { useApis } from '../api/use-apis';
import { useTexts } from '../localization/texts';
import { getOrCreateDeviceId } from './device-id';

interface PlayerContextValue {
  // Null while loading, on failure, and before the user has been onboarded
  // and registered (loading is false and error null then).
  player: IdentifyPlayer | null;
  // Avatars available to the player.
  avatars: PlayerAvatars | null;
  loading: boolean;
  error: string | null;
  // Select one of the available avatars / rename the player. Reject when the
  // server refuses; the player is left as it was then.
  setAvatar: (avatarId: string) => Promise<void>;
  setName: (name: string) => Promise<void>;
  // Identifies the player anew after identification has failed.
  retry: () => void;
  // Marks the player as onboarded once the onboarding is through — creating
  // the player for this device first if there's none yet. Rejects when the
  // server refuses.
  completeOnboarding: () => Promise<void>;
}

interface PlayerState {
  player: IdentifyPlayer | null;
  avatars: PlayerAvatars | null;
  loading: boolean;
  failed: boolean;
}

const INITIAL_STATE: PlayerState = { player: null, avatars: null, loading: true, failed: false };

const PlayerContext = createContext<PlayerContextValue>({
  player: null,
  avatars: null,
  loading: true,
  error: null,
  setAvatar: async () => undefined,
  setName: async () => undefined,
  completeOnboarding: async () => undefined,
  retry: () => undefined,
});

async function getDeviceIdentity(): Promise<IdentifyPlayerRequest> {
  return {
    authProvider: PlayerAuthProviderEnum.anonymous,
    externalId: await getOrCreateDeviceId(),
  };
}

export function PlayerProvider({ children }: PropsWithChildren) {
  const { playerApi } = useApis();
  const errorTexts = useTexts('errors');
  const [state, setState] = useState<PlayerState>(INITIAL_STATE);
  // Bumped by retry() to identify again.
  const [attempt, setAttempt] = useState(0);

  // A refused access token is renewed by identifying the player again.
  useEffect(() => {
    authSession.setReauthenticate(async () => {
      const { session } = await playerApi.identify(await getDeviceIdentity());
      return session?.accessToken ?? null;
    });
    return () => authSession.setReauthenticate(null);
  }, [playerApi]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { session } = await playerApi.identify(await getDeviceIdentity());
        if (!cancelled) {
          authSession.setAccessToken(session?.accessToken ?? null);
          setState({
            player: session?.player ?? null,
            avatars: session?.avatars ?? null,
            loading: false,
            failed: false,
          });
        }
      } catch {
        if (!cancelled) setState({ player: null, avatars: null, loading: false, failed: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playerApi, attempt]);

  const retry = useCallback(() => {
    setState(INITIAL_STATE);
    setAttempt((current) => current + 1);
  }, []);

  const playerId = state.player?.id;

  const setAvatar = useCallback(
    async (avatarId: string) => {
      if (!playerId) return;
      const result = await playerApi.setAvatar({ avatarId });
      setState((current) =>
        current.player
          ? {
              ...current,
              player: { ...current.player, avatarId: result.avatarId },
              avatars: result.avatars,
            }
          : current,
      );
    },
    [playerApi, playerId],
  );

  const setName = useCallback(
    async (name: string) => {
      if (!playerId) return;
      const player = await playerApi.setName({ name });
      setState((current) => ({ ...current, player }));
    },
    [playerApi, playerId],
  );

  const completeOnboarding = useCallback(async () => {
    if (!playerId) {
      const { player, avatars, accessToken } = await playerApi.register(await getDeviceIdentity());
      authSession.setAccessToken(accessToken);
      setState({ player, avatars, loading: false, failed: false });
    }
    const player = await playerApi.completeOnboarding();
    setState((current) => ({ ...current, player }));
  }, [playerApi, playerId]);

  // The message is resolved here rather than when the failure happens, so it
  // follows a language change without re-running identification.
  const value = useMemo(
    () => ({
      player: state.player,
      avatars: state.avatars,
      loading: state.loading,
      error: state.failed ? errorTexts.identifyPlayer : null,
      setAvatar,
      setName,
      completeOnboarding,
      retry,
    }),
    [state, errorTexts, setAvatar, setName, completeOnboarding, retry],
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  return useContext(PlayerContext);
}
