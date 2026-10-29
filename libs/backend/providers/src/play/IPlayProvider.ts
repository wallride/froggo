import { play } from "@dead-lines-inc/common.models";

export interface IPlayProvider {
  add(play: play.Play): Promise<void>;
  get(id: string): Promise<play.Play | null>;
  getForChallengeParticipation(participationId: string): Promise<play.Play[]>;
}
