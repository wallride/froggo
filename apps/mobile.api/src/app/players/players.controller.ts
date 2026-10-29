import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import {
  IdentifyPlayerRequest,
  identifyPlayerRequestSchema,
  SetPlayerAvatarRequest,
  setPlayerAvatarRequestSchema,
  SetPlayerNameRequest,
  setPlayerNameRequestSchema,
} from '@dead-lines-inc/common.api.mobile';

import { AuthenticatedPlayerId } from '../auth/authenticated-player-id.decorator';
import { PlayerAuthGuard } from '../auth/player-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PlayersService } from './players.service';

// Validation pipes go on the body itself: a method-wide one would also be
// run on the authenticated player id.
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Post('identify')
  identify(
    @Body(new ZodValidationPipe(identifyPlayerRequestSchema)) request: IdentifyPlayerRequest,
  ) {
    return this.playersService.identify(request);
  }

  @Post('register')
  register(
    @Body(new ZodValidationPipe(identifyPlayerRequestSchema)) request: IdentifyPlayerRequest,
  ) {
    return this.playersService.register(request);
  }

  @Post('set-avatar')
  @UseGuards(PlayerAuthGuard)
  setAvatar(
    @AuthenticatedPlayerId() playerId: string,
    @Body(new ZodValidationPipe(setPlayerAvatarRequestSchema)) request: SetPlayerAvatarRequest,
  ) {
    return this.playersService.setAvatar(playerId, request);
  }

  @Post('set-name')
  @UseGuards(PlayerAuthGuard)
  setName(
    @AuthenticatedPlayerId() playerId: string,
    @Body(new ZodValidationPipe(setPlayerNameRequestSchema)) request: SetPlayerNameRequest,
  ) {
    return this.playersService.setName(playerId, request);
  }

  @Post('complete-onboarding')
  @UseGuards(PlayerAuthGuard)
  completeOnboarding(@AuthenticatedPlayerId() playerId: string) {
    return this.playersService.completeOnboarding(playerId);
  }
}
