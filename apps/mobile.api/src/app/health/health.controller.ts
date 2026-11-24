import { Controller, Get, Optional } from '@nestjs/common';

import { MongoConnection } from '@dead-lines-inc/backend.providers';

import { SkipAppVersionCheck } from '../app-version/skip-app-version-check.decorator';
import { DatabaseState, Liveness, liveness } from './liveness';

// Liveness for the hosting platform: while deploying it asks GET /api/health
// and restarts the container when it doesn't get a 2xx. Kept independent of
// MongoDB and of the app version, so a slow database or an outdated client
// doesn't look like a dead process — the database state is only reported.
@Controller('health')
@SkipAppVersionCheck()
export class HealthController {
  constructor(@Optional() private readonly connection?: MongoConnection) {}

  @Get()
  check(): Liveness {
    return liveness(this.databaseState());
  }

  private databaseState(): DatabaseState {
    if (!this.connection) {
      return 'unknown';
    }
    return this.connection.isConnected() ? 'connected' : 'disconnected';
  }
}
