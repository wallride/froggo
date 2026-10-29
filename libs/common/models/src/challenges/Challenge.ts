import * as z from 'zod/v4';

import { PlayTypeEnum } from "../play/PlayTypeEnum";

export enum ChallengeStatusEnum {
  active = 'active',
  finished = 'finished',
}

// Play types that participate in events/leaderboards — everything except freePlay.
export const challengePlayTypeSchema = z.enum(PlayTypeEnum).exclude([PlayTypeEnum.freePlay]);

// Daily or weekly play event with its own top players ranking
export const challengeSchema = z.object({
  id: z.string(),
  status: z.enum(ChallengeStatusEnum),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  type: challengePlayTypeSchema,
  boardIds: z.array(z.string()), // boards to play within event
});
export type Challenge = z.infer<typeof challengeSchema>;
