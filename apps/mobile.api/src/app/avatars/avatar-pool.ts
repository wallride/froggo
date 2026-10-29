import * as z from 'zod/v4';

import { Avatar, AvatarRarityEnum, PlayerAvatars } from '@dead-lines-inc/common.models';

// All avatars in the game: their ids (image file names) by rarity. Common
// ones are available to every player from the start and given at random to
// new players; the rest are unlocked by achievements.
export const avatarPoolOptionsSchema = z.record(
  z.enum(AvatarRarityEnum),
  z.array(z.string()),
).refine((pool) => pool[AvatarRarityEnum.common].length > 0, {
  message: 'there must be at least one common avatar',
});

export type AvatarPoolOptions = z.infer<typeof avatarPoolOptionsSchema>;

export class AvatarPool {
  // Every avatar, from common to legendary.
  readonly avatars: Avatar[];
  private readonly starterAvatarIds: string[];

  constructor(options: AvatarPoolOptions) {
    this.avatars = Object.values(AvatarRarityEnum).flatMap((rarity) =>
      (options[rarity] ?? []).map((id) => ({ id, rarity })),
    );
    this.starterAvatarIds = options[AvatarRarityEnum.common];
  }

  // For a newly created player.
  pickRandomStarterAvatarId(): string {
    return this.starterAvatarIds[Math.floor(Math.random() * this.starterAvatarIds.length)];
  }

  // What a player starts with. No achievements unlock avatars yet, so every
  // player has just the common ones.
  createPlayerAvatars(playerId: string): PlayerAvatars {
    return { playerId, avatarIds: [...this.starterAvatarIds] };
  }
}
