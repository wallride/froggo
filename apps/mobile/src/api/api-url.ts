import { MobileApiConfiguration } from '@dead-lines-inc/common.models';

import { API_BASE_URL } from './api-config';

// Full URL of a configured route. The configured baseUrl wins; without one
// we stay on the address the configuration was loaded from.
export function apiUrl(
  api: MobileApiConfiguration,
  route: keyof MobileApiConfiguration['routes'],
): string {
  return `${api.baseUrl ?? API_BASE_URL}${api.routes[route]}`;
}

// Full URL of an asset from the configuration: absolute ones as they are,
// paths on the API's address like routes.
export function assetUrl(api: MobileApiConfiguration, url: string): string {
  return /^https?:\/\//.test(url) ? url : `${api.baseUrl ?? API_BASE_URL}${url}`;
}
