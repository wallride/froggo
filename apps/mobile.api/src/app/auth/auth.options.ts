import * as z from 'zod/v4';

// Access tokens: signed (HS256) with the secret, carry the player's id and
// expire after the TTL — the app then identifies again for a fresh one.
export const authOptionsSchema = z.object({
  // At least 32 random characters. Changing it signs every player out (they
  // are signed in again on their next request).
  tokenSecret: z.string().min(32),
  accessTokenTtlMinutes: z.number().int().min(1).default(24 * 60),
});

export type AuthOptions = z.infer<typeof authOptionsSchema>;
