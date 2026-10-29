import * as z from 'zod/v4';

import { PlayTypeEnum } from "./PlayTypeEnum";

export const playSchema = z.object({
  id: z.string(),
  isWon: z.boolean(),
  playedAt: z.iso.datetime(),
  type: z.enum(PlayTypeEnum),
  player: z.object({
    id: z.string(),
  }),
  challengeParticipation: z.object({
    id: z.string(),
    challenge: z.object({
      id: z.string(),
    })
  }).optional(),
  board: z.object({
    id: z.string(),
    size: z.number().int(),
  }),
  marksUsed: z.number().int(),
  stars: z.number().int(),
  score: z.number().int(),
  timeMs: z.number().int(),
});
export type Play = z.infer<typeof playSchema>;
