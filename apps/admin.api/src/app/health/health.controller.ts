import { Controller, Get } from '@nestjs/common';

// Liveness for the hosting platform: while deploying it asks GET /api/health
// and restarts the container when it doesn't get a 2xx. Kept independent of
// MongoDB, so a slow database doesn't look like a dead process.
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
