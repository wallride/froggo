import { PropsWithChildren } from 'react';

import { usePlayer } from '../identity/player-context';
import { LoadingScreen } from '../screens/LoadingScreen';

// Shows the loading screen while the player is being resolved from local
// storage or freshly identified against the API, and only reveals the app
// once that's done.
export function PlayerGate({ children }: PropsWithChildren) {
  const { player, loading, error } = usePlayer();

  if (loading || error || !player) {
    return <LoadingScreen error={error} />;
  }

  return children;
}
