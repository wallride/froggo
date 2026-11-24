import { SetMetadata } from '@nestjs/common';

export const SKIP_APP_VERSION_CHECK = 'skipAppVersionCheck';

// Keeps the global AppVersionGuard out of a route. For the requests that don't
// come from the mobile app at all and can't carry its version — the hosting
// platform's health check, first of all.
export const SkipAppVersionCheck = () => SetMetadata(SKIP_APP_VERSION_CHECK, true);
