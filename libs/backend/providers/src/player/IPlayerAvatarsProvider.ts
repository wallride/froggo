import { PlayerAvatars } from "@dead-lines-inc/common.models";

// API provider for PlayerAvatars models: one record per player.
export interface IPlayerAvatarsProvider {
  get(playerId: string): Promise<PlayerAvatars | null>;
  // Creates the player's record or replaces it.
  update(playerAvatars: PlayerAvatars): Promise<PlayerAvatars>;
}
