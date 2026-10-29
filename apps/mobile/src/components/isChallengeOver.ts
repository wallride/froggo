import { challenges } from '@dead-lines-inc/common.models';

// Over once the server has finished it, or as soon as its time is up — the
// server finishes expired challenges only when asked for them.
export function isChallengeOver(challenge: challenges.Challenge, now = Date.now()): boolean {
  return (
    challenge.status === challenges.ChallengeStatusEnum.finished ||
    new Date(challenge.endAt).getTime() <= now
  );
}
