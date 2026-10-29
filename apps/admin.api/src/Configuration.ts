import * as z from "zod/v4";

import * as providers from '@dead-lines-inc/backend.providers';

export const configurationSchema = z.object({
  dependencies: z.object({
    boardProvider: providers.jsonFileProviderOptionsSchema
  })
});
export type Configuration = z.infer<typeof configurationSchema>;
