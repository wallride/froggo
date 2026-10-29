import * as z from 'zod/v4';

export enum AvatarRarityEnum {
  common = 'common', // available to every player from the start
  rare = 'rare',
  epic = 'epic',
  legendary = 'legendary',
}

// An avatar is identified by its image file name, which ends with its rarity
// (avatar_65_common.png). The pool of avatars is set in the API's
// configuration; the images are served by it too.
export const avatarSchema = z.object({
  id: z.string(),
  rarity: z.enum(AvatarRarityEnum),
});

export type Avatar = z.infer<typeof avatarSchema>;
