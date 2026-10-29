import { MongoServerError } from "mongodb";
import * as uuid from 'uuid';

import { IdentifyPlayer, identifyPlayerSchema, PlayerAuthProviderEnum } from "@dead-lines-inc/common.models";

import { MongoProvider } from "../MongoProvider";
import { IPlayerProvider } from "./IPlayerProvider";

const DUPLICATE_KEY_ERROR = 11000;

export class MongoPlayerProvider extends MongoProvider<IdentifyPlayer> implements IPlayerProvider {
  protected schema = identifyPlayerSchema;

  protected override getModelId(model: IdentifyPlayer): string {
    return model.id;
  }

  // Players are looked up by id and by identity, and an identity belongs to
  // one player only. Safe to call on every start.
  async ensureIndexes(): Promise<void> {
    await this.collection.createIndex({ id: 1 }, { unique: true });
    await this.collection.createIndex(
      { 'identity.authProvider': 1, 'identity.externalId': 1 },
      { unique: true },
    );
  }

  async get(id: string): Promise<IdentifyPlayer | null> {
    return this.findModel(id);
  }

  async getMany(ids: string[]): Promise<IdentifyPlayer[]> {
    return ids.length ? this.findModels({ id: { $in: ids } }) : [];
  }

  async update(player: IdentifyPlayer): Promise<IdentifyPlayer> {
    return this.save(player);
  }

  async findByIdentity(
    authProvider: PlayerAuthProviderEnum,
    externalId: string,
  ): Promise<IdentifyPlayer | null> {
    const document = await this.collection.findOne({
      'identity.authProvider': authProvider,
      'identity.externalId': externalId,
    });
    return document ? this.parse(document) : null;
  }

  async create(
    authProvider: PlayerAuthProviderEnum,
    externalId: string,
    avatarId: string,
  ): Promise<IdentifyPlayer> {
    try {
      return await this.save({
        id: uuid.v4(),
        name: 'Player',
        avatarId,
        isOnboarded: false,
        identity: {
          authProvider,
          externalId,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === DUPLICATE_KEY_ERROR) {
        const existing = await this.findByIdentity(authProvider, externalId);
        if (existing) return existing;
      }
      throw error;
    }
  }
}
