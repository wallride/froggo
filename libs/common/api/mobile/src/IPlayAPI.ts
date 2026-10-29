import * as z from 'zod/v4';

import { Board, PlayTypeEnum, challenges, playBoardSchema, play } from '@dead-lines-inc/common.models';

// Transport-layer payload for IPlayAPI.startPlay(). Board selection is a
// random pick for now.
export const startPlayRequestSchema = z.object({
  type: z.enum(PlayTypeEnum),
  challengeId: z.string().optional(),
});
export type StartPlayRequest = z.infer<typeof startPlayRequestSchema>;

export const getActiveChallengesResponseSchema = challenges.challengeSchema.extend({
  participation: challenges.challengeParticipationSchema,
});
export type GetActiveChallengesResponse = z.infer<typeof getActiveChallengesResponseSchema>;

// Leaves the player's challenge of `type` once it's finished — the
// participation gets confirmed (finished) — and joins them to a fresh one.
export const joinChallengeRequestSchema = z.object({
  type: challenges.challengePlayTypeSchema,
});
export type JoinChallengeRequest = z.infer<typeof joinChallengeRequestSchema>;

export const joinChallengeResponseSchema = challenges.challengeSchema.extend({
  participation: challenges.challengeParticipationSchema,
});
export type JoinChallengeResponse = z.infer<typeof joinChallengeResponseSchema>;

export const startPlayResponseSchema = z.object({
  board: playBoardSchema,
  scoresGained: z.object({
    perTarget: z.number().int().min(1),
    perEachFreeCell: z.number().int().min(0),
  }),
  // Present for challenge plays — includes a participation the client
  // didn't have yet if this is the player's first play in the challenge
  // (the server creates it on demand), so acceptPlayResults always has
  // something to attach the play to.
  challengeParticipation: challenges.challengeParticipationSchema.optional(),
});
export type StartPlayResponse = z.infer<typeof startPlayResponseSchema>;

// Every play must be the authenticated player's own, and every history the
// one of the play it comes with — otherwise the whole request is refused.
export const acceptPlayResultsRequestSchema = z.object({
  plays: z.array(z.object({
    play: play.playSchema,
    history: play.playHistorySchema
  }))
});
export type AcceptPlayResultsRequest = z.infer<typeof acceptPlayResultsRequestSchema>;

export const getLeaderboardRequestSchema = z.object({
  challengeId: z.string(),
});
export type GetLeaderboardRequest = z.infer<typeof getLeaderboardRequestSchema>;

export const getLeaderboardResponseSchema = z.object({
  leaderboard: challenges.challengeLeaderboardSchema,
  // Boards from the challenge that the player hasn't played yet — drives
  // whether a "Play next" action makes sense.
  remainingBoardIds: z.array(z.string()),
});
export type GetLeaderboardResponse = z.infer<typeof getLeaderboardResponseSchema>;

// Acts on behalf of the authenticated player, see IPlayerAPI.
export interface IPlayAPI {
  getActiveChallenges(): Promise<GetActiveChallengesResponse[]>;
  joinChallenge(request: JoinChallengeRequest): Promise<JoinChallengeResponse>;
  startPlay(request: StartPlayRequest): Promise<StartPlayResponse>;
  acceptPlayResults(request: AcceptPlayResultsRequest): Promise<void>;
  getLeaderboard(request: GetLeaderboardRequest): Promise<GetLeaderboardResponse>;
}
