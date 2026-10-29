import { IdentifyPlayer, play } from "@dead-lines-inc/common.models";

export interface IPlayProcessor {
  // this method adds the batch to internal queue and resolves the promise only when the batch is processed
  saveResults(player: IdentifyPlayer, batch: play.PlayResultsBatch): Promise<void>;
}
