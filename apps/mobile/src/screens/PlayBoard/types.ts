import {
  IdentifyPlayer,
  PlayBoard as PlayBoardModel,
  PlayTypeEnum,
  challenges,
} from '@dead-lines-inc/common.models';

export type GameState = 'playing' | 'won' | 'lost';

// What finding one target earned in quota (score) mode — kept as its parts,
// not just a total, so the score animation can play them out one by one.
export interface ScoreGain {
  // Board index of the found target, which earned targetPoints.
  targetCell: number;
  targetPoints: number;
  // Board indices of the cells that were unmarked at that moment; each one
  // earned pointsPerFreeCell.
  freeCells: number[];
  pointsPerFreeCell: number;
}

export interface PlayBoardProps {
  board: PlayBoardModel;
  type: PlayTypeEnum;
  player: IdentifyPlayer;
  challenge?: challenges.Challenge;
  challengeParticipation?: challenges.ChallengeParticipation;
  // The challenge's leaderboard as it stood before this play — carried
  // through to the post-play results overlay, then on to the Leaderboard
  // screen so it can animate this play's rank change.
  previousLeaderboard?: challenges.ChallengeLeaderboard;
}
