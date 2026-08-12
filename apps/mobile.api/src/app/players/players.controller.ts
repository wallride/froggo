import { Body, Controller, Post, UsePipes } from '@nestjs/common';

import { IdentifyPlayerRequest, identifyPlayerRequestSchema } from '@froggo/common.api.mobile';

import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Post('identify')
  @UsePipes(new ZodValidationPipe(identifyPlayerRequestSchema))
  identify(@Body() request: IdentifyPlayerRequest) {
    return this.playersService.identify(request);
  }
}
