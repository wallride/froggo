import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AppVersionHeaders, readAppVersion } from './app-version';

interface VersionedRequest {
  headers: AppVersionHeaders;
}

// The app release a request came from ("x.y.z"), from its X-App-Version
// header. Only for handlers behind the global AppVersionGuard, which refuses
// requests without a usable version — hence the check below, unreachable until
// then.
export const AppVersion = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const version = readAppVersion(context.switchToHttp().getRequest<VersionedRequest>().headers);
    if (!version) throw new BadRequestException('The app version is missing');
    return version;
  },
);
