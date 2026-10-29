import { useEffect, useRef } from 'react';
import * as Crypto from 'expo-crypto';

import { IdentifyPlayer, PlayTypeEnum, challenges, play } from '@dead-lines-inc/common.models';

import { queuePendingPlayResult } from '../../api/pending-play-results';
import { useApis } from '../../api/use-apis';
import type { GameState } from './types';

interface UsePlayResultSubmissionArgs {
  gameState: GameState;
  type: PlayTypeEnum;
  player: IdentifyPlayer;
  boardId: string;
  boardSize: number;
  challengeParticipation?: challenges.ChallengeParticipation;
  stars: number;
  score: number;
  getElapsedMs: () => number;
  getHistory: () => play.PlayActionRecord;
}

// Once the game ends, report the play + its action history. A failed
// submission (offline, server error) is queued to resend on the next
// opportunity (see PlayGate's flushPendingPlayResults) rather than lost.
export function usePlayResultSubmission({
  gameState,
  type,
  player,
  boardId,
  boardSize,
  challengeParticipation,
  stars,
  score,
  getElapsedMs,
  getHistory,
}: UsePlayResultSubmissionArgs): void {
  const { playApi } = useApis();
  const submittedRef = useRef(false);

  useEffect(() => {
    if (gameState === 'playing' || submittedRef.current) return;
    submittedRef.current = true;

    const historyRecords = getHistory();

    const playRecord: play.Play = {
      id: Crypto.randomUUID(),
      isWon: gameState === 'won',
      playedAt: new Date().toISOString(),
      type,
      player: { id: player.id },
      ...(challengeParticipation
        ? {
            challengeParticipation: {
              id: challengeParticipation.id,
              challenge: { id: challengeParticipation.challenge.id },
            },
          }
        : {}),
      board: { id: boardId, size: boardSize },
      marksUsed: historyRecords.filter(
        (action) => action.type === play.PlayActionTypeEnum.setMark,
      ).length,
      stars,
      score,
      timeMs: getElapsedMs(),
    };

    const entry = {
      play: playRecord,
      history: {
        play: { id: playRecord.id },
        history: [historyRecords],
      },
    };

    playApi.acceptPlayResults({ plays: [entry] }).catch(() => {
      queuePendingPlayResult(entry);
    });
  }, [gameState]);
}
