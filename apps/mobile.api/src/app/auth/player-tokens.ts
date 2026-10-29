import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface PlayerTokenPayload {
  sub: string; // player id
}

// Issues and checks the players' access tokens.
@Injectable()
export class PlayerTokens {
  constructor(private readonly jwtService: JwtService) {}

  issue(playerId: string): Promise<string> {
    return this.jwtService.signAsync({ sub: playerId } satisfies PlayerTokenPayload);
  }

  // The player id the token was issued to, or null if the token is forged,
  // malformed or expired.
  async verify(token: string): Promise<string | null> {
    try {
      const payload = await this.jwtService.verifyAsync<PlayerTokenPayload>(token);
      return typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  }
}
