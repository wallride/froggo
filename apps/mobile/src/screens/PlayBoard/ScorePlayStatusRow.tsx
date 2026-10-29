import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

import { PlayTypeEnum } from '@dead-lines-inc/common.models';

import { PlayResultChip } from './PlayResultChip';
import { PlayStatusRow } from './PlayStatusRow';
import { CLONE_COLOR } from "./scoreAnimation";

interface ScorePlayStatusRowProps {
  foundTargets: number;
  boardSize: number;
  // What's shown, which lags the real score while the score animation plays.
  score: number;
  // The score chip, so the score animation knows where to fly to.
  scoreChipRef: RefObject<View | null>;
}

// Status row of a quota (score) play: the score.
export function ScorePlayStatusRow({
  foundTargets,
  boardSize,
  score,
  scoreChipRef,
}: ScorePlayStatusRowProps) {
  return (
    <PlayStatusRow foundTargets={foundTargets} boardSize={boardSize}>
      <PlayResultChip type={PlayTypeEnum.score} label={`${score}`} chipRef={scoreChipRef} />
    </PlayStatusRow>
  );
}
