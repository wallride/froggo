import * as uuid from 'uuid';
import { Filter } from "mongodb";

import { challenges, play } from "@dead-lines-inc/common.models";

import { IChallengeProvider } from "./IChallengeProvider";
import { MongoProvider } from "../MongoProvider";
import { MongoTransaction } from "../MongoTransaction";


export class MongoChallengeProvider extends MongoProvider<challenges.Challenge> implements IChallengeProvider {
  protected schema = challenges.challengeSchema;

  // Challenges start whenever the previous one fills up, so several may
  // start within the same moment — the random suffix keeps ids unique.
  protected makeId(startDate: string, type: play.PlayTypeEnum): string {
    return `${startDate.replace(/[^0-9]/ig, '')}-${type}-${uuid.v4().slice(0, 8)}`;
  }

  protected override getModelId(model: challenges.Challenge): string {
    return model.id;
  }

  async get(id: string): Promise<challenges.Challenge> {
    return this.getModel(id);
  }

  async start(challenge: Omit<challenges.Challenge, 'id' | 'status'>, transaction?: MongoTransaction): Promise<challenges.Challenge> {
    const id = this.makeId(challenge.startAt, challenge.type);
    return this.save(
      {
        id,
        status: challenges.ChallengeStatusEnum.active,
        ...challenge,
      },
      transaction,
    )
  }

  // endAt is stored as a UTC ISO string, so string comparison orders it by time.
  async finishExpired(now: Date = new Date()): Promise<void> {
    await this.collection.updateMany(
      { status: challenges.ChallengeStatusEnum.active, endAt: { $lte: now.toISOString() } },
      { $set: { status: challenges.ChallengeStatusEnum.finished } },
    );
  }

  async getLatest(type: challenges.Challenge['type']): Promise<challenges.Challenge | null> {
    return this.findLatest({ type, status: challenges.ChallengeStatusEnum.active });
  }

  async getMany(ids: string[]): Promise<challenges.Challenge[]> {
    if (ids.length === 0) return [];
    return this.findModels({ id: { $in: ids } });
  }

  protected async findLatest(filter: Filter<challenges.Challenge>): Promise<challenges.Challenge | null> {
    const document = await this.collection.findOne(filter, { sort: { startAt: -1 } });
    return document ? this.parse(document) : null;
  }
}
