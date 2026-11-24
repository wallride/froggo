import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { APP_VERSION_UNSUPPORTED } from '@dead-lines-inc/common.api.mobile';

import { Configuration } from '../../Configuration';
import { CONFIGURATION } from '../configuration/configuration.token';
import { AppVersionHeaders, isAppVersionSupported, readAppVersion } from './app-version';
import { SKIP_APP_VERSION_CHECK } from './skip-app-version-check.decorator';

// The part of the HTTP request the guard works with.
interface VersionedRequest {
  headers: AppVersionHeaders;
}

// Nest's HttpStatus lacks Upgrade Required.
const UPGRADE_REQUIRED = 426;

// Refuses every request from an app release older than the configured
// minimum, so an update can be forced: the app answers 426 with its update
// alert. Runs before the route guards (`APP_GUARD` in AppModule), so it
// applies to the configuration endpoint too — that's the first request of a
// start, and the app learns it must be updated before doing anything else.
// A request without a readable version is refused as well. Routes marked with
// @SkipAppVersionCheck() are let through: they aren't the app's.
@Injectable()
export class AppVersionGuard implements CanActivate {
  private readonly logger = new Logger(AppVersionGuard.name);
  // Versions already reported, so a client left running on an outdated build
  // doesn't flood the log with one line per request.
  private readonly reported = new Set<string>();

  constructor(
    @Inject(CONFIGURATION) private readonly configuration: Configuration,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.isSkipped(context)) return true;

    const request = context.switchToHttp().getRequest<VersionedRequest>();
    const version = readAppVersion(request.headers);
    const minimumVersion = this.configuration.minimumAppVersion;
    if (isAppVersionSupported(version, minimumVersion)) return true;

    this.report(version, minimumVersion);
    throw new HttpException(
      { code: APP_VERSION_UNSUPPORTED, minimumVersion },
      UPGRADE_REQUIRED,
    );
  }

  private isSkipped(context: ExecutionContext): boolean {
    return Boolean(
      this.reflector.getAllAndOverride<boolean>(SKIP_APP_VERSION_CHECK, [
        context.getHandler(),
        context.getClass(),
      ]),
    );
  }

  private report(version: string | null, minimumVersion: string): void {
    const key = `${version ?? '(not sent)'} -> ${minimumVersion}`;
    if (this.reported.has(key)) return;
    this.reported.add(key);
    this.logger.warn(
      `Refusing app version ${version ?? '(not sent)'}: the minimum is ${minimumVersion}`,
    );
  }
}
