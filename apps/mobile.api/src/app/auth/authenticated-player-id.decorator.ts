import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest } from './player-auth.guard';

// The id of the player the request is made by. Only for handlers behind
// PlayerAuthGuard.
export const AuthenticatedPlayerId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().playerId,
);
