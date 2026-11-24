// Compares release versions ("x.y.z") the way the stores order them: each
// part numerically, from major to patch.

import { APP_VERSION_HEADER } from '@dead-lines-inc/common.api.mobile';

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

type Version = readonly [major: number, minor: number, patch: number];

function parseVersion(version: string): Version | null {
  const match = VERSION_PATTERN.exec(version.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

// Whether a client's version is the minimum or newer. A version that can't be
// read isn't supported: the app always sends one, so anything else is a client
// we can't reason about, and guessing could as well let an outdated one in.
export function isAppVersionSupported(
  version: string | null | undefined,
  minimumVersion: string,
): boolean {
  const client = version ? parseVersion(version) : null;
  const minimum = parseVersion(minimumVersion);
  if (!client || !minimum) return false;

  for (let index = 0; index < minimum.length; index++) {
    if (client[index] !== minimum[index]) return client[index] > minimum[index];
  }
  return true;
}

// The version a request declares in its X-App-Version header, if it declares
// one.
export function readAppVersion(headers: AppVersionHeaders): string | null {
  const value = headers[APP_VERSION_HEADER.toLowerCase()];
  const version = Array.isArray(value) ? value[0] : value;
  return version?.trim() || null;
}

// The part of an HTTP request this module needs: its headers, lowercased by
// Node.
export interface AppVersionHeaders {
  [name: string]: string | string[] | undefined;
}
