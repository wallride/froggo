import { IdentifyPlayer, PlayerAuthProviderEnum } from "@froggo/common.models";

// API provider for Player models. Used by higher level APIs on backend
export interface IPlayerProvider {
  // Resolves the canonical IdentifyPlayer for a given identity, creating
  // one if it doesn't exist yet.
  identify(authProvider: PlayerAuthProviderEnum, externalId: string): Promise<IdentifyPlayer>;

  get(id: string): Promise<IdentifyPlayer | null>;
  update(player: IdentifyPlayer): Promise<IdentifyPlayer>;
}
