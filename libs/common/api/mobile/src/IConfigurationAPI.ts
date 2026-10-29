import * as z from 'zod/v4';

import { MobileConfiguration } from '@dead-lines-inc/common.models';

// Route of the configuration endpoint. Fixed (unlike the routes inside the
// configuration itself) because the app needs it to bootstrap.
export const CONFIGURATION_ROUTE = '/api/configuration';

export const getConfigurationRequestSchema = z.object({
  // BCP 47 tag of the language the app would like its texts in ("ru-RU"),
  // or a comma-separated list of them, most preferred first — the device's
  // system languages ("de-DE,ru-RU,en-US"). The server takes the first one
  // it has, and falls back to its default language if none is close enough.
  language: z.string().optional(),
});
export type GetConfigurationRequest = z.infer<typeof getConfigurationRequestSchema>;

export interface IConfigurationAPI {
  getConfiguration(request: GetConfigurationRequest): Promise<MobileConfiguration>;
}
