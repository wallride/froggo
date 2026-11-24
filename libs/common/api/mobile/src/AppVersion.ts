import * as z from 'zod/v4';

import { appVersionSchema } from '@dead-lines-inc/common.models';

// Every request from the app carries its release version in this header, so
// the server can refuse builds below its configured minimum and know which
// release a player runs. The app takes it from its build configuration, so
// it's the version the store released.
export const APP_VERSION_HEADER = 'X-App-Version';

// Body of the 426 Upgrade Required response: the app must be updated before
// it can use the API. The app shows its update alert on this response.
export const APP_VERSION_UNSUPPORTED = 'APP_VERSION_UNSUPPORTED';

export const appVersionErrorSchema = z.object({
  code: z.literal(APP_VERSION_UNSUPPORTED),
  // The oldest version the API accepts, "x.y.z".
  minimumVersion: appVersionSchema,
});
export type AppVersionError = z.infer<typeof appVersionErrorSchema>;
