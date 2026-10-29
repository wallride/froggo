import * as z from 'zod/v4';

import { playerSchema } from "../Player";

export enum ParticipationStateEnum {
  new = 'new', // Player has not played yet
  playing = 'playing', // Player have at least one play record in this challenge
  completed = 'completed', // Player's played all boards in this challenge
  finished = 'finished', // Player confirmed the result of the challenge participation
}

// Player's participation in a challenge — also their leaderboard record.
// Personal plays aren't kept here: they link to it by
// Play.challengeParticipation.id.

export const challengeParticipationSchema = z.object({
  id: z.string(),
  challenge: z.object({
    id: z.string()
  }),
  state: z.enum(ParticipationStateEnum),
  player: playerSchema,
  score: z.number().int().default(0),
  avgTimeMs: z.number().int().optional(),
  lastPlayTimestamp: z.iso.datetime().optional(),
  boardsPlayed: z.number().int().default(0),
  boardsWon: z.number().int().default(0),
});
export type ChallengeParticipation = z.infer<typeof challengeParticipationSchema>;
