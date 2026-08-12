import * as z from "zod/v4";

import * as providers from '@froggo/backend.providers';

export const configurationSchema = z.object({
  dependencies: z.object({
    boardProvider: providers.jsonFileProviderOptionsSchema
  })
});
export type Configuration = z.infer<typeof configurationSchema>;
