import { challenges } from "@dead-lines-inc/common.models";

export interface IChallengeProvider {
  get(id: string): Promise<challenges.Challenge>;
  // Starts the challenge as active.
  start(challenge: Omit<challenges.Challenge, 'id' | 'status'>): Promise<challenges.Challenge>;
  // Marks every active challenge whose endAt has passed by `now` as finished.
  finishExpired(now?: Date): Promise<void>;
  // The most recently started active challenge of a type — the one new players join.
  getLatest(type: challenges.Challenge['type']): Promise<challenges.Challenge | null>;
  getMany(ids: string[]): Promise<challenges.Challenge[]>;
}
