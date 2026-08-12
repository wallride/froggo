import { PropsWithChildren } from 'react';

import { PlayerProvider } from '../../identity/player-context';

export function AppProviders({ children }: PropsWithChildren) {
  return <PlayerProvider>{children}</PlayerProvider>;
}
