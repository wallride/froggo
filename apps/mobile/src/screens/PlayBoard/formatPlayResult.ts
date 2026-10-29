import { PlayTypeEnum } from '@dead-lines-inc/common.models';

import { formatText } from '../../localization/texts';

// The mode-appropriate headline result: elapsed time for time mode, score
// for score mode, nothing for free play. Used by PlayResultOverlay (final, on
// game end); the live status rows (ScorePlayStatusRow, TimePlayStatusRow) show
// their own result.
export function formatPlayResult(
  type: PlayTypeEnum,
  elapsedSeconds: number,
  score: number,
  secondsTemplate: string, // MobileTexts.common.secondsShort
): string | null {
  switch (type) {
    case PlayTypeEnum.time:
      return formatText(secondsTemplate, { seconds: elapsedSeconds });
    case PlayTypeEnum.score:
      return `${score}`;
    default:
      return null;
  }
}
