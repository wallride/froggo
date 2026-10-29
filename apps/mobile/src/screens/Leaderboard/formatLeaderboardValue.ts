import { challenges, PlayTypeEnum } from '@dead-lines-inc/common.models';

import { formatText } from '../../localization/texts';

// What the challenge ranks by: boards won in accuracy mode, score
// otherwise (time mode's average only moves along with it).
export function leaderboardRankedValue(
  type: challenges.Challenge['type'],
  entry: challenges.ChallengeParticipation,
): number {
  return type === PlayTypeEnum.accuracy ? entry.boardsWon : entry.score;
}

// The participant's result as the leaderboard shows it: average time in time
// mode ("—" before the first win), the ranked value otherwise.
export function formatLeaderboardValue(
  type: challenges.Challenge['type'],
  entry: challenges.ChallengeParticipation,
  secondsTemplate: string, // MobileTexts.common.secondsShort
): string {
  if (type === PlayTypeEnum.time) {
    return entry.avgTimeMs === undefined
      ? '—'
      : formatText(secondsTemplate, { seconds: Math.round(entry.avgTimeMs / 1000) });
  }
  return `${leaderboardRankedValue(type, entry)}`;
}
