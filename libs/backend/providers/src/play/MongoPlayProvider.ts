import { play } from "@dead-lines-inc/common.models";

import { MongoProvider } from "../MongoProvider";
import { MongoTransaction } from "../MongoTransaction";
import { IPlayProvider } from "./IPlayProvider";

export class MongoPlayProvider extends MongoProvider<play.Play> implements IPlayProvider {
  protected schema = play.playSchema;

  protected override getModelId(model: play.Play): string {
    return model.id;
  }

  async add(play: play.Play, transaction?: MongoTransaction): Promise<void> {
    await this.save(play, transaction);
  }

  async get(id: string): Promise<play.Play | null> {
    return this.findModel(id);
  }

  async getForChallengeParticipation(participationId: string): Promise<play.Play[]> {
    return await this.findModels({ 'challengeParticipation.id': participationId });
  }
}
