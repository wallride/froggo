import { APP_VERSION_HEADER } from '@dead-lines-inc/common.api.mobile';

import { APP_VERSION } from './app-version';
import { requireAppUpdate } from './app-update';

// fetch() to mobile.api on behalf of the app: every request says which release
// it comes from, and a refusal (426 Upgrade Required) raises the update alert
// before the caller treats it as an ordinary failure.
export async function appFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set(APP_VERSION_HEADER, APP_VERSION);
  const res = await fetch(url, { ...init, headers });
  if (res.status === 426) requireAppUpdate();
  return res;
}
