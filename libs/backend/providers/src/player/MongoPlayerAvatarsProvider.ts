import { Filter } from "mongodb";

import { PlayerAvatars, playerAvatarsSchema } from "@dead-lines-inc/common.models";

import { MongoProvider } from "../MongoProvider";
import { IPlayerAvatarsProvider } from "./IPlayerAvatarsProvider";

// Keyed by the player's id, so a player can't have more than one record.
export class MongoPlayerAvatarsProvider extends MongoProvider<PlayerAvatars> implements IPlayerAvatarsProvider {
  protected schema = playerAvatarsSchema;

  protected override getModelId(model: PlayerAvatars): string {
    return model.playerId;
  }

  protected override getIdFilter(playerId: string): Filter<PlayerAvatars> {
    return { playerId };
  }

  // Safe to call on every start.
  async ensureIndexes(): Promise<void> {
    await this.collection.createIndex({ playerId: 1 }, { unique: true });
  }

  async get(playerId: string): Promise<PlayerAvatars | null> {
    return this.findModel(playerId);
  }

  async update(playerAvatars: PlayerAvatars): Promise<PlayerAvatars> {
    return this.save(playerAvatars);
  }
}
