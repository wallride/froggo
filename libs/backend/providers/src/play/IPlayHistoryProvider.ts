import { play } from "@dead-lines-inc/common.models";

export interface IPlayHistoryProvider {
  add(history: play.PlayHistory): Promise<void>;
}
