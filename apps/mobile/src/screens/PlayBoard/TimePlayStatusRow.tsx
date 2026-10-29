import { PlayTypeEnum } from '@dead-lines-inc/common.models';

import { formatText, useTexts } from '../../localization/texts';
import { PlayResultChip } from './PlayResultChip';
import { PlayStatusRow } from './PlayStatusRow';
import { PlayTimeline } from './PlayTimeline';
import type { TimelineResult } from './timelineLayout';

interface TimePlayStatusRowProps {
  foundTargets: number;
  boardSize: number;
  elapsedSeconds: number;
  // Other players' times to show on the timeline against the player's own.
  results: TimelineResult[];
}

// Status row of a time (rush) play: the running time, and a timeline of how
// it compares to other players' — in the space between.
export function TimePlayStatusRow({
  foundTargets,
  boardSize,
  elapsedSeconds,
  results,
}: TimePlayStatusRowProps) {
  const commonTexts = useTexts('common');

  return (
    <PlayStatusRow foundTargets={foundTargets} boardSize={boardSize}>
      <PlayTimeline elapsedSeconds={elapsedSeconds} results={results} />
      <PlayResultChip
        type={PlayTypeEnum.time}
        label={formatText(commonTexts.secondsShort, { seconds: elapsedSeconds })}
        // Up to 999 seconds without the chip changing width.
        widestLabel={formatText(commonTexts.secondsShort, { seconds: 888 })}
      />
    </PlayStatusRow>
  );
}
