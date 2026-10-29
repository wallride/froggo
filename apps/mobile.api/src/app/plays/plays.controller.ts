import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import {
  AcceptPlayResultsRequest,
  acceptPlayResultsRequestSchema,
  GetLeaderboardRequest,
  getLeaderboardRequestSchema,
  JoinChallengeRequest,
  joinChallengeRequestSchema,
  StartPlayRequest,
  startPlayRequestSchema,
} from '@dead-lines-inc/common.api.mobile';

import { AuthenticatedPlayerId } from '../auth/authenticated-player-id.decorator';
import { PlayerAuthGuard } from '../auth/player-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PlaysService } from './plays.service';

// Validation pipes go on the body/query itself: a method-wide one would also
// be run on the authenticated player id.
@Controller('plays')
@UseGuards(PlayerAuthGuard)
export class PlaysController {
  constructor(private readonly playsService: PlaysService) {}

  @Get('active-challenges')
  getActiveChallenges(@AuthenticatedPlayerId() playerId: string) {
    return this.playsService.getActiveChallenges(playerId);
  }

  @Post('join-challenge')
  joinChallenge(
    @AuthenticatedPlayerId() playerId: string,
    @Body(new ZodValidationPipe(joinChallengeRequestSchema)) request: JoinChallengeRequest,
  ) {
    return this.playsService.joinChallenge(playerId, request);
  }

  @Post('start')
  startPlay(
    @AuthenticatedPlayerId() playerId: string,
    @Body(new ZodValidationPipe(startPlayRequestSchema)) request: StartPlayRequest,
  ) {
    return this.playsService.startPlay(playerId, request);
  }

  @Post('accept-results')
  acceptPlayResults(
    @AuthenticatedPlayerId() playerId: string,
    @Body(new ZodValidationPipe(acceptPlayResultsRequestSchema)) request: AcceptPlayResultsRequest,
  ) {
    return this.playsService.acceptPlayResults(playerId, request);
  }

  @Get('leaderboard')
  getLeaderboard(
    @AuthenticatedPlayerId() playerId: string,
    @Query(new ZodValidationPipe(getLeaderboardRequestSchema)) request: GetLeaderboardRequest,
  ) {
    return this.playsService.getLeaderboard(playerId, request);
  }
}
