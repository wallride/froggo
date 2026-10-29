import { PropsWithChildren } from 'react';

import { ConfigurationProvider } from '../../configuration/configuration-context';

export function AppProviders({ children }: PropsWithChildren) {
  return <ConfigurationProvider>{children}</ConfigurationProvider>;
}
