import * as z from 'zod/v4';

// Base Cell model that is stored in the board storage
export const cellSchema = z.object({
  key: z.number().int(),
  kind: z.number(),
  hasTarget: z.boolean().optional()
});

export type Cell = z.infer<typeof cellSchema>;


// Cell extension in play mode
export const playCellSchema = cellSchema.extend({
  isMarked: z.boolean().optional(), // Is marked by the player as "no target here"
  isStated: z.boolean().optional(), // Is marked by the player as "target is here" (possibly wrong)
});
export type PlayCell = z.infer<typeof playCellSchema>;
