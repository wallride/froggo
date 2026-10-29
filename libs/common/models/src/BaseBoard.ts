import * as z from 'zod/v4';

import { cellSchema, playCellSchema } from './Cell';

// Board is n x n with n targets (one per kind), so n also caps how many cell
// kinds — colors/textures — a board can use. Bigger boards make cells too small
// to play on a phone.
export const MIN_BOARD_SIZE = 5;
export const MAX_BOARD_SIZE = 12;

// Base Board model that is received from board storage
export const baseBoardSchema = z
  .object({
    size: z.number().int().min(MIN_BOARD_SIZE).max(MAX_BOARD_SIZE),
    cells: z.array(cellSchema)
  })
  .refine((board) => board.cells.length === board.size * board.size, {
    message: 'cells must contain exactly n * n entries'
  })
  .refine((board) => board.cells.every((cell) => cell.kind <= board.size), {
    message: 'cell kind must not exceed n'
  });

export type BaseBoard = z.infer<typeof baseBoardSchema>;

export enum BoardStateEnum {
  public = 'public',
  draft = 'draft',
  testing = 'testing',
}

export enum BoardComplexityEnum {
  easy = 'easy',
  normal = 'normal',
  hard = 'hard',
  insane = 'insane',
}

export const boardStatsSchema = z.object({
  avgScore: z.number(),
  avgStars: z.number(),
  avgTime: z.number(), // in seconds
  playsTotal: z.number(),
  topTimes: z.array(z.number()),
});
export type BoardStats = z.infer<typeof boardStatsSchema>;


// Identified Board model (stored on backend)
export const boardSchema = baseBoardSchema.safeExtend({
  id: z.string(),
  createdAt: z.iso.datetime(),
  state: z.enum(BoardStateEnum),
  complexity: z.enum(BoardComplexityEnum),
  stats: boardStatsSchema
});
export type Board = z.infer<typeof boardSchema>;


// Board extension in play mode. Keeps the originating board's id (needed to
// report play results back against it) without the rest of Board's
// admin-only metadata (createdAt/state/complexity/stats).
export const playBoardSchema = baseBoardSchema.safeExtend({
  id: z.string(),
  cells: z.array(playCellSchema)
})
export type PlayBoard = z.infer<typeof playBoardSchema>;
