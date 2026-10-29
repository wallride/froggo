import { PropsWithChildren } from 'react';

import { usePlayer } from '../identity/player-context';
import { Onboarding } from '../onboarding/Onboarding';
import { useStartupStage } from '../startup/startup-progress';

// Holds the app back while the player is being identified against the API
// (the startup screen is shown meanwhile, with the error if it fails),
// onboards a user who has no player yet or hasn't gone through the
// onboarding (it ends by registering them, if need be, and marking them
// onboarded), and only reveals the app once there is an onboarded player.
export function PlayerGate({ children }: PropsWithChildren) {
  const { player, loading, error, retry } = usePlayer();
  const identified = !loading && !error;
  useStartupStage('player', identified, error, retry);
  // Onboarding comes first instead of the home screen: no home screen data
  // to wait for.
  useStartupStage('home', identified && !player?.isOnboarded);

  if (!identified) return null;

  if (!player?.isOnboarded) {
    return <Onboarding />;
  }

  return children;
}
