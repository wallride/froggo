import * as z from 'zod/v4';

import { challengePlayTypeSchema } from "./Challenge";
import { challengeParticipationSchema } from "./ChallengeParticipation";

export const challengeLeaderboardSchema = z.object({
  challenge: z.object({
    id: z.string(),
    type: challengePlayTypeSchema,
  }),
  leaderboard: z.array(challengeParticipationSchema),
});
export type ChallengeLeaderboard = z.infer<typeof challengeLeaderboardSchema>;
