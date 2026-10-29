import {
  CONFIGURATION_ROUTE,
  GetConfigurationRequest,
  IConfigurationAPI,
} from '@dead-lines-inc/common.api.mobile';
import { MobileConfiguration, mobileConfigurationSchema } from '@dead-lines-inc/common.models';

import { API_BASE_URL } from './api-config';

// Talks to the bootstrap address (API_BASE_URL) — the configuration is what
// tells the rest of the app where the API lives, so it can't depend on it.
export class ConfigurationAPI implements IConfigurationAPI {
  async getConfiguration(request: GetConfigurationRequest): Promise<MobileConfiguration> {
    const query = new URLSearchParams(request.language ? { language: request.language } : {});
    const res = await fetch(`${API_BASE_URL}${CONFIGURATION_ROUTE}?${query}`);
    if (!res.ok) {
      throw new Error('Failed to load app configuration');
    }
    return mobileConfigurationSchema.parse(await res.json());
  }
}
