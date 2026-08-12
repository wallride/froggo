import * as z from 'zod/v4';

import { IdentifyPlayer, PlayerAuthProviderEnum } from '@froggo/common.models';

// Transport-layer payload for IPlayerAPI.identify(). externalId is the
// device-generated ID for PlayerAuthProviderEnum.anonymous, or the provider
// account ID otherwise.
export const identifyPlayerRequestSchema = z.object({
  authProvider: z.enum(PlayerAuthProviderEnum),
  externalId: z.string(),
});

export type IdentifyPlayerRequest = z.infer<typeof identifyPlayerRequestSchema>;

export interface IPlayerAPI {
  identify(request: IdentifyPlayerRequest): Promise<IdentifyPlayer>;
}
