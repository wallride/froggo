import * as z from 'zod/v4';

export enum PlayerAuthProviderEnum {
  anonymous = 'anonymous',
  google = 'google',
}

// Private personal data: identity/auth data. Only for the player accessing
// their own record (e.g. after identify()) — never for general listings.
export const playerIdentitySchema = z.object({
  authProvider: z.enum(PlayerAuthProviderEnum),
  externalId: z.string(),
  createdAt: z.iso.datetime(),
});

export type PlayerIdentity = z.infer<typeof playerIdentitySchema>;

// Public player data — safe to include in general listings (leaderboards,
// etc.). Must never carry identity/auth data.
export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarId: z.string(),
});

export type Player = z.infer<typeof playerSchema>;

// The Player model extended with identity. Only for the player accessing
// their own record (e.g. after identify()) — never for general listings.
export const identifyPlayerSchema = playerSchema.extend({
  identity: playerIdentitySchema,
});

export type IdentifyPlayer = z.infer<typeof identifyPlayerSchema>;
