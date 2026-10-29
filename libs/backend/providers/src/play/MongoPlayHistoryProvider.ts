import { Filter } from "mongodb";

import { play } from "@dead-lines-inc/common.models";

import { MongoProvider } from "../MongoProvider";
import { MongoTransaction } from "../MongoTransaction";
import { IPlayHistoryProvider } from "./IPlayHistoryProvider";

// PlayHistory has no id of its own — it's keyed by the play it belongs to,
// one history document per play.
export class MongoPlayHistoryProvider extends MongoProvider<play.PlayHistory> implements IPlayHistoryProvider {
  protected schema = play.playHistorySchema;

  protected override getModelId(model: play.PlayHistory): string {
    return model.play.id;
  }

  protected override getIdFilter(id: string): Filter<play.PlayHistory> {
    return { 'play.id': id } as unknown as Filter<play.PlayHistory>;
  }

  async add(history: play.PlayHistory, transaction?: MongoTransaction): Promise<void> {
    await this.save(history, transaction);
  }
}
