import * as z from "zod/v4";

import * as providers from '@froggo/backend.providers';

export const configurationSchema = z.object({
  dependencies: z.object({
    playerProvider: providers.jsonFileProviderOptionsSchema
  }),
  // Allowed CORS origins for the mobile app's web target (native builds
  // aren't subject to browser CORS). Omit to allow any origin, which is
  // fine for local dev but should be set explicitly in production.
  cors: z.object({
    allowedOrigins: z.array(z.string())
  }).optional()
});
export type Configuration = z.infer<typeof configurationSchema>;
