import * as z from "zod/v4";

import * as providers from '@dead-lines-inc/backend.providers';

export const configurationSchema = z.object({
  dependencies: z.object({
    boardProvider: providers.mongoProviderOptionsSchema,
    mongo: providers.mongoConnectionOptionsSchema
  })
});
export type Configuration = z.infer<typeof configurationSchema>;

// Secrets never go to the configuration file (it may be committed, and is
// mounted into the container as it is): they come from the environment only.
export const environmentSchema = z.object({
  // With the login and password: "mongodb://user:password@host:27017/?authSource=admin".
  MONGO_URI: z.string().min(1),
});

// The file is the configuration without the secrets — and must not have them:
// a secret left there is an error, not silently ignored.
const configurationFileSchema = configurationSchema.extend({
  dependencies: configurationSchema.shape.dependencies.extend({
    mongo: z.strictObject(providers.mongoConnectionOptionsSchema.omit({ uri: true }).shape),
  }),
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
  });
}
