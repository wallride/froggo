import * as z from 'zod/v4';

// Avatars available to a player: the common ones from the start, plus those
// unlocked by achievements. One record per player. Only ids are kept — an
// avatar's rarity comes from the avatar pool.
export const playerAvatarsSchema = z.object({
  playerId: z.string(),
  avatarIds: z.array(z.string()),
});

export type PlayerAvatars = z.infer<typeof playerAvatarsSchema>;
