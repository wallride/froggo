 import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PlayBoard as PlayBoardModel, challenges } from '@dead-lines-inc/common.models';

import type { RootStackParamList } from '../app/Navigation';
import { flushPendingPlayResults } from '../api/pending-play-results';
import { useApis } from '../api/use-apis';
import { usePlayer } from '../identity/player-context';
import { useTexts } from '../localization/texts';
import { LoadingScreen } from './LoadingScreen';
import { PlayBoard } from './PlayBoard';

type Props = NativeStackScreenProps<RootStackParamList, 'Play'>;

// Loads a random board for the requested play type, then swaps to the
// actual play board once that's done — same loading-then-content pattern
// as PlayerGate.
export function PlayGate({ route }: Props) {
  const { playType, challenge, challengeParticipation: initialChallengeParticipation } =
    route.params;
  const { player } = usePlayer();
  const { playApi } = useApis();
  const errorTexts = useTexts('errors');
  const [board, setBoard] = useState<PlayBoardModel | null>(null);
  const [failed, setFailed] = useState(false);
  // Starts from the nav param, but startPlay's response takes over once it
  // arrives — for a player's first play in a challenge, the server creates
  // the participation on demand and this is the only way the client learns
  // its id (needed later to attach the play's results to it).
  const [challengeParticipation, setChallengeParticipation] = useState(
    initialChallengeParticipation,
  );
  // A snapshot of the challenge's leaderboard as it stood before this play,
  // so the post-play Leaderboard screen can animate rank changes caused by
  // it. Best-effort only — not fetched for free play, and the play itself
  // isn't blocked on it resolving.
  const [previousLeaderboard, setPreviousLeaderboard] =
    useState<challenges.ChallengeLeaderboard | undefined>(undefined);

  useEffect(() => {
    if (!player) return;
    let cancelled = false;

    // Opportunistic retry: if we can reach the API to start a play, it's a
    // good moment to also flush any earlier results that failed to submit.
    // Independent of startPlay — its own failure shouldn't block play.
    flushPendingPlayResults(playApi).catch(() => {});

    playApi
      .startPlay({
        type: playType,
        challengeId: challenge?.id,
      })
      .then((loaded) => {
        if (cancelled) return;
        setBoard(loaded.board);
        if (loaded.challengeParticipation) {
          setChallengeParticipation(loaded.challengeParticipation);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    if (challenge) {
      playApi
        .getLeaderboard({ challengeId: challenge.id })
        .then((result) => {
          if (!cancelled) setPreviousLeaderboard(result.leaderboard);
        })
        .catch(() => {
          // No snapshot to animate from — the Leaderboard screen falls
          // back to showing rows without a rank change.
        });
    }

    return () => {
      cancelled = true;
    };
  }, [player, playApi, playType, challenge]);

  if (!board || !player) {
    return <LoadingScreen error={failed ? errorTexts.startPlay : null} />;
  }

  return (
    <PlayBoard
      board={board}
      type={playType}
      player={player}
      challenge={challenge}
      challengeParticipation={challengeParticipation}
      previousLeaderboard={previousLeaderboard}
    />
  );
}
