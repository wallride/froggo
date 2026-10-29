import * as z from "zod/v4";

import * as providers from '@dead-lines-inc/backend.providers';
import { mobileConfigurationSourceSchema } from '@dead-lines-inc/common.models';

import { assetsOptionsSchema } from './app/assets/assets.options';
import { authOptionsSchema } from './app/auth/auth.options';
import { avatarPoolOptionsSchema } from './app/avatars/avatar-pool';
import { challengeBotsOptionsSchema } from './app/plays/challenge-bots';

export const configurationSchema = z.object({
  dependencies: z.object({
    playerProvider: providers.mongoProviderOptionsSchema,
    playerAvatarsProvider: providers.mongoProviderOptionsSchema,
    boardProvider: providers.jsonFileProviderOptionsSchema,
    mongo: providers.mongoConnectionOptionsSchema,
    challengeProvider: providers.mongoProviderOptionsSchema,
    challengeParticipationProvider: providers.mongoProviderOptionsSchema,
    playHistoryProvider: providers.mongoProviderOptionsSchema,
    playProvider: providers.mongoProviderOptionsSchema
  }),
  // Players' access tokens.
  auth: authOptionsSchema,
  // A challenge takes new players until this many have joined it, then the
  // next one is started.
  maxChallengeParticipators: z.number().int().min(1),
  // How long a challenge lasts from its start until it's finished. Shorten
  // it to debug what happens once challenges are over.
  challengeDuration: z
    .object({
      hours: z.number().int().min(0),
      minutes: z.number().int().min(0),
    })
    .refine(({ hours, minutes }) => hours > 0 || minutes > 0, {
      message: 'challenge duration must be longer than zero',
    })
    .default({ hours: 24, minutes: 0 }),
  // Testing aid: bot players with results in every new challenge. Omit or
  // disable for real multiplayer.
  challengeBots: challengeBotsOptionsSchema.optional(),
  // All avatars in the game: image file names by rarity. The images are
  // asset files, in "avatars/" under the assets root.
  avatarPool: avatarPoolOptionsSchema,
  // Files the mobile app loads at runtime.
  assets: assetsOptionsSchema,
  // Served to the mobile app at start (GET /api/configuration), one language at a time.
  mobileConfiguration: mobileConfigurationSourceSchema,
  // Allowed CORS origins for the mobile app's web target (native builds
  // aren't subject to browser CORS). Omit to allow any origin, which is
  // fine for local dev but should be set explicitly in production.
  cors: z.object({
    allowedOrigins: z.array(z.string())
  }).optional()
});
export type Configuration = z.infer<typeof configurationSchema>;

// Secrets never go to the configuration file (it may be committed, and is
// mounted into the container as it is): they come from the environment only.
export const environmentSchema = z.object({
  // With the login and password: "mongodb://user:password@host:27017/?authSource=admin".
  MONGO_URI: z.string().min(1),
  AUTH_TOKEN_SECRET: authOptionsSchema.shape.tokenSecret,
});

// The file is the configuration without the secrets — and must not have them:
// a secret left there is an error, not silently ignored.
const configurationFileSchema = configurationSchema.extend({
  dependencies: configurationSchema.shape.dependencies.extend({
    mongo: z.strictObject(providers.mongoConnectionOptionsSchema.omit({ uri: true }).shape),
  }),
  auth: z.strictObject(authOptionsSchema.omit({ tokenSecret: true }).shape),
});

export function buildConfiguration(file: unknown, environment: NodeJS.ProcessEnv): Configuration {
  const fromFile = configurationFileSchema.parse(file);
  const secrets = environmentSchema.parse(environment);
  return configurationSchema.parse({
    ...fromFile,
    dependencies: {
      ...fromFile.dependencies,
      mongo: { ...fromFile.dependencies.mongo, uri: secrets.MONGO_URI },
    },
    auth: { ...fromFile.auth, tokenSecret: secrets.AUTH_TOKEN_SECRET },
  });
}
