import { Controller, Get } from '@nestjs/common';

import { SkipAppVersionCheck } from '../app-version/skip-app-version-check.decorator';
import { Liveness, liveness } from './liveness';

// Liveness for the hosting platform: while deploying it asks GET /api/health
// and restarts the container when it doesn't get a 2xx. Kept independent of
// MongoDB and of the app version, so a slow database or an outdated client
// doesn't look like a dead process.
@Controller('health')
@SkipAppVersionCheck()
export class HealthController {
  @Get()
  check(): Liveness {
    return liveness();
  }
}
