import * as path from 'node:path';

import * as z from "zod/v4";

import { appVersionSchema } from '@dead-lines-inc/common.models';
import * as providers from '@dead-lines-inc/backend.providers';
import { mobileConfigurationSourceSchema } from '@dead-lines-inc/common.models';

import { assetsOptionsSchema } from './app/assets/assets.options';
import { authOptionsSchema } from './app/auth/auth.options';
import { avatarPoolOptionsSchema } from './app/avatars/avatar-pool';
import { challengeBotsOptionsSchema } from './app/plays/challenge-bots';

// What the game is: content, limits and provider options. It is the same in
// every environment — a deployment doesn't change it and it ships with the
// release (the packer puts it next to main.js), so nothing has to be mounted
// into the container to start the app. Strict: a key that belongs to the
// environment (a secret, an address, a deployment switch) is an error here,
// not silently ignored.
export const contentConfigurationSchema = z.strictObject({
  dependencies: z.object({
    playerProvider: providers.mongoProviderOptionsSchema,
    playerAvatarsProvider: providers.mongoProviderOptionsSchema,
    boardProvider: providers.mongoProviderOptionsSchema,
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
  // Served to the mobile app at start (GET /api/configuration), one language at a time.
  mobileConfiguration: mobileConfigurationSourceSchema,
});
export type ContentConfiguration = z.infer<typeof contentConfigurationSchema>;

// What depends on the environment a copy of the app runs in: secrets and
// deployment switches. Never in the configuration file.
export const environmentSchema = z.object({
  // With the login and password: "mongodb://user:password@host:27017/?authSource=admin".
  MONGO_URI: z.string().min(1),
  AUTH_TOKEN_SECRET: authOptionsSchema.shape.tokenSecret,
  // The oldest app release allowed to use the API ("x.y.z", the version the
  // app was released as). Older builds, and ones that don't say their version,
  // get 426 Upgrade Required from every request and show their update alert.
  MINIMUM_APP_VERSION: appVersionSchema,
  // Allowed CORS origins for the mobile app's web target, comma-separated
  // ("https://a.example,https://b.example"); native builds aren't subject to
  // browser CORS. Omit to allow any origin, which is fine for local dev but
  // should be set explicitly in production.
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  // Where the asset files (avatars) are, as the process sees them. The release
  // has them in "assets" next to main.js, which is the default; local runs
  // point this to the workspace's ".mount/assets".
  ASSETS_ROOT_PATH: z.string().optional(),
  // Where the app should get the files instead, e.g. a CDN or a reverse proxy
  // serving ASSETS_ROOT_PATH as it is: "https://cdn.example.com/assets".
  // Omit to have the app get them from the API itself.
  ASSETS_PUBLIC_BASE_URL: z.url().optional(),
});

// The configuration as the app uses it: the content plus what the environment
// adds to it.
export const configurationSchema = contentConfigurationSchema.extend({
  minimumAppVersion: appVersionSchema,
  assets: assetsOptionsSchema,
  cors: z.object({
    allowedOrigins: z.array(z.string())
  }).optional()
});
export type Configuration = z.infer<typeof configurationSchema>;

// The assets root used when ASSETS_ROOT_PATH isn't set: next to main.js, where
// the release packer puts the files.
const ASSETS_ROOT_PATH_DEFAULT = path.join(__dirname, 'assets');

function parseAllowedOrigins(origins: string | undefined): string[] | undefined {
  const list = origins
    ?.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  return list?.length ? list : undefined;
}

// The file is the content configuration without the secrets — they come from
// the environment only, and one left in the file is an error, not silently
// ignored (the file may be committed and is packed into the release as it is).
export const configurationFileSchema = contentConfigurationSchema.extend({
  dependencies: contentConfigurationSchema.shape.dependencies.extend({
    mongo: z.strictObject(providers.mongoConnectionOptionsSchema.omit({ uri: true }).shape),
  }),
  auth: z.strictObject(authOptionsSchema.omit({ tokenSecret: true }).shape),
});
export type ContentConfigurationFile = z.infer<typeof configurationFileSchema>;

export function buildConfiguration(file: unknown, environment: NodeJS.ProcessEnv): Configuration {
  const content = configurationFileSchema.parse(file);
  const fromEnvironment = environmentSchema.parse(environment);
  const allowedOrigins = parseAllowedOrigins(fromEnvironment.CORS_ALLOWED_ORIGINS);

  return configurationSchema.parse({
    ...content,
    dependencies: {
      ...content.dependencies,
      mongo: { ...content.dependencies.mongo, uri: fromEnvironment.MONGO_URI },
    },
    auth: { ...content.auth, tokenSecret: fromEnvironment.AUTH_TOKEN_SECRET },
    minimumAppVersion: fromEnvironment.MINIMUM_APP_VERSION,
    assets: {
      rootPath: fromEnvironment.ASSETS_ROOT_PATH ?? ASSETS_ROOT_PATH_DEFAULT,
      publicBaseUrl: fromEnvironment.ASSETS_PUBLIC_BASE_URL,
    },
    cors: allowedOrigins ? { allowedOrigins } : undefined,
  });
}
