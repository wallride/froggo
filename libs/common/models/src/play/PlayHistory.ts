import * as z from 'zod/v4';

export enum PlayActionTypeEnum {
  setMark = 'setMark',
  unsetMark = 'unsetMark',
  state = 'state',
}

// Record of an action performed by the player
export const playActionRecordSchema = z.array(z.object({
  timeMs: z.number().int(),
  type: z.enum(PlayActionTypeEnum),
  cellKey: z.number().int(), // the original key of the cell that player had interacted
}));
export type PlayActionRecord = z.infer<typeof playActionRecordSchema>;



// Record of how the player has been playing the board
export const playHistorySchema = z.object({
  play: z.object({
    id: z.string(),
  }),
  history: z.array(playActionRecordSchema).optional()
});
export type PlayHistory = z.infer<typeof playHistorySchema>;
