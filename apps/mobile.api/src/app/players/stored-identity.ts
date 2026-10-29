import { createHash } from 'node:crypto';

import { PlayerAuthProviderEnum } from '@dead-lines-inc/common.models';

// What a player's externalId is stored as. An anonymous player's one is the
// secret their device signs in with, so only its SHA-256 is kept: a leaked
// player storage doesn't let anyone sign in as them. A plain hash is enough
// — device ids are random UUIDs, far too many to guess or precompute — and
// unlike a salted one it can be looked up by. Other providers' ids are no
// secret and are kept as they are.
export function toStoredExternalId(
  authProvider: PlayerAuthProviderEnum,
  externalId: string,
): string {
  return authProvider === PlayerAuthProviderEnum.anonymous
    ? createHash('sha256').update(externalId).digest('hex')
    : externalId;
}
