import { IdentifyPlayer, PlayerAuthProviderEnum } from "@dead-lines-inc/common.models";

// API provider for Player models. Used by higher level APIs on backend
export interface IPlayerProvider {
  // The player with a given identity, if there is one.
  findByIdentity(
    authProvider: PlayerAuthProviderEnum,
    externalId: string,
  ): Promise<IdentifyPlayer | null>;

  // Creates a player with a given identity, not onboarded yet. A player with that identity
  // already there (say, created by a concurrent request) is returned instead
  // — there's never more than one.
  create(
    authProvider: PlayerAuthProviderEnum,
    externalId: string,
    avatarId: string,
  ): Promise<IdentifyPlayer>;

  get(id: string): Promise<IdentifyPlayer | null>;
  // The ones of `ids` that exist, in no particular order.
  getMany(ids: string[]): Promise<IdentifyPlayer[]>;
  update(player: IdentifyPlayer): Promise<IdentifyPlayer>;
}
