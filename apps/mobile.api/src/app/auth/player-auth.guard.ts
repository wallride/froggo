import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { PlayerTokens } from './player-tokens';

// The part of the HTTP request the guard works with. playerId is set by
// PlayerAuthGuard and read with @AuthenticatedPlayerId().
export interface AuthenticatedRequest {
  headers: { authorization?: string };
  playerId: string;
}

// Lets a request through only with a valid access token
// (Authorization: Bearer <token>), and remembers whose it is.
@Injectable()
export class PlayerAuthGuard implements CanActivate {
  constructor(private readonly playerTokens: PlayerTokens) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    const playerId = scheme === 'Bearer' && token ? await this.playerTokens.verify(token) : null;
    if (!playerId) {
      throw new UnauthorizedException();
    }

    request.playerId = playerId;
    return true;
  }
}
