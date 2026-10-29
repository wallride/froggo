import * as z from 'zod/v4';

export enum PlayerAuthProviderEnum {
  anonymous = 'anonymous',
  google = 'google',
  // Testing aid on the server (challenge bots). Can't be signed in with.
  bot = 'bot',
}

// Private personal data: identity/auth data. Only for the player accessing
// their own record (e.g. after identify()) — never for general listings.
export const playerIdentitySchema = z.object({
  authProvider: z.enum(PlayerAuthProviderEnum),
  // As stored: for PlayerAuthProviderEnum.anonymous the SHA-256 (hex) of the
  // device's secret id, never the id itself.
  externalId: z.string(),
  createdAt: z.iso.datetime(),
});

export type PlayerIdentity = z.infer<typeof playerIdentitySchema>;

// A name the player gives themselves. Surrounding whitespace is dropped.
export const PLAYER_NAME_MAX_LENGTH = 20;
export const playerNameSchema = z.string().trim().min(1).max(PLAYER_NAME_MAX_LENGTH);

// Public player data — safe to include in general listings (leaderboards,
// etc.). Must never carry identity/auth data.
export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarId: z.string(), // Avatar id: the avatar's image file name
});

export type Player = z.infer<typeof playerSchema>;

// The Player model extended with identity. Only for the player accessing
// their own record (e.g. after identify()) — never for general listings.
export const identifyPlayerSchema = playerSchema.extend({
  identity: playerIdentitySchema,
  // Has gone through the onboarding (the invitation and the tutorial). Until
  // then the app shows it instead of the home screen. Players created before
  // there was such a flag haven't.
  isOnboarded: z.boolean().default(false),
});

export type IdentifyPlayer = z.infer<typeof identifyPlayerSchema>;
