import { challenges, play } from "@dead-lines-inc/common.models";

export interface IChallengeParticipationProvider {
  get(id: string): Promise<challenges.ChallengeParticipation>;
  getForChallenges(playerId: string, challenges: challenges.Challenge[]): Promise<challenges.ChallengeParticipation[]>;
  // Every participation of the player not finished (confirmed) yet.
  getUnfinished(playerId: string): Promise<challenges.ChallengeParticipation[]>;
  // Ids of every challenge the player has joined.
  getJoinedChallengeIds(playerId: string): Promise<string[]>;
  countForChallenge(challenge: challenges.Challenge): Promise<number>;
  getAllForChallenge(challenge: challenges.Challenge): Promise<challenges.ChallengeParticipation[]>;
  participate(playerId: string, challenge: challenges.Challenge): Promise<challenges.ChallengeParticipation>;
  // Recalculates the participation's results from all of its plays, and its
  // state: playing, or completed once every board of the challenge is played.
  updateResults(participation: challenges.ChallengeParticipation, challenge: challenges.Challenge, plays: play.Play[]): Promise<challenges.ChallengeParticipation>;
  // Sets lastPlayTimestamp of every participation of the player not finished
  // yet, unless it's later already.
  touchUnfinished(playerId: string, timestamp: string): Promise<void>;
  // The player has confirmed their result — the participation is done with.
  finish(participation: challenges.ChallengeParticipation): Promise<challenges.ChallengeParticipation>;
}
