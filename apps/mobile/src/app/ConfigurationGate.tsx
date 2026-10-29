import { PropsWithChildren, useEffect } from 'react';

import { prefetchAvatars } from '../assets/avatars';
import { useConfigurationState } from '../configuration/configuration-context';
import { useStartupProgress, useStartupStage } from '../startup/startup-progress';
import { startupTexts } from '../startup/startup-texts';

// Holds the app back until the configuration is loaded — it runs before
// player identification, which already needs the configured API routes. The
// startup screen is shown meanwhile, with the error if it fails. Once it's
// there, the avatar images it lists are downloaded.
export function ConfigurationGate({ children }: PropsWithChildren) {
  const { configuration, error, reload } = useConfigurationState();
  const { report } = useStartupProgress();
  useStartupStage(
    'configuration',
    !!configuration,
    error && startupTexts.configurationFailed,
    reload,
  );

  // Only the first configuration's: a language change brings the same ones.
  const loaded = !!configuration;
  useEffect(() => {
    if (configuration) prefetchAvatars(configuration, (fraction) => report('avatars', fraction));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, report]);

  return configuration ? children : null;
}
