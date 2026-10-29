import * as z from 'zod/v4';

import {
  IdentifyPlayer,
  identifyPlayerSchema,
  PlayerAuthProviderEnum,
  playerAvatarsSchema,
  playerNameSchema,
} from '@dead-lines-inc/common.models';

// Transport-layer payload for IPlayerAPI.identify() and register() — the
// player's credentials. externalId is the device-generated secret ID for
// PlayerAuthProviderEnum.anonymous; it must never be shown to anyone else.
// Other providers aren't accepted yet: their account ID isn't a secret, so
// they need a verified provider token instead.
export const identifyPlayerRequestSchema = z.object({
  authProvider: z.enum(PlayerAuthProviderEnum),
  externalId: z.string(),
});

export type IdentifyPlayerRequest = z.infer<typeof identifyPlayerRequestSchema>;

// The player with the avatars available to them.
export const playerProfileSchema = z.object({
  player: identifyPlayerSchema,
  avatars: playerAvatarsSchema,
});

export type PlayerProfile = z.infer<typeof playerProfileSchema>;

// The player's profile with an access token for every other request. The
// token expires; the app then identifies again to get a fresh one.
export const playerSessionSchema = playerProfileSchema.extend({
  accessToken: z.string(),
});

export type PlayerSession = z.infer<typeof playerSessionSchema>;

// session is null when no player has this identity yet — the app then
// onboards the user and registers them.
export const identifyPlayerResponseSchema = z.object({
  session: playerSessionSchema.nullable(),
});

export type IdentifyPlayerResponse = z.infer<typeof identifyPlayerResponseSchema>;

// Selects one of the avatars available to the player.
export const setPlayerAvatarRequestSchema = z.object({
  avatarId: z.string(),
});

export type SetPlayerAvatarRequest = z.infer<typeof setPlayerAvatarRequestSchema>;

// The avatars available to the player and the selected one.
export const setPlayerAvatarResponseSchema = z.object({
  avatarId: z.string(),
  avatars: playerAvatarsSchema,
});

export type SetPlayerAvatarResponse = z.infer<typeof setPlayerAvatarResponseSchema>;

export const setPlayerNameRequestSchema = z.object({
  name: playerNameSchema,
});

export type SetPlayerNameRequest = z.infer<typeof setPlayerNameRequestSchema>;

// identify() and register() authenticate the player. Every other method of
// IPlayerAPI and IPlayAPI acts on behalf of the player whose access token is
// sent with it (Authorization: Bearer <accessToken>).
export interface IPlayerAPI {
  // Finds the player with this identity, never creates one.
  identify(request: IdentifyPlayerRequest): Promise<IdentifyPlayerResponse>;
  // Creates a player with this identity. If there already is one, it's
  // returned as is, so a retried request doesn't create a second player.
  register(request: IdentifyPlayerRequest): Promise<PlayerSession>;
  // Fails unless the avatar is available to the player.
  setAvatar(request: SetPlayerAvatarRequest): Promise<SetPlayerAvatarResponse>;
  // Resolves to the renamed player.
  setName(request: SetPlayerNameRequest): Promise<IdentifyPlayer>;
  // Marks the player as having gone through the onboarding; resolves to them.
  completeOnboarding(): Promise<IdentifyPlayer>;
}
