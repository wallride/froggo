import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';

import { PlayTypeEnum } from '@dead-lines-inc/common.models';
import { colors } from '@dead-lines-inc/frontend';

import type { RootStackParamList } from '../../app/Navigation';
import { Screen } from '../../layout/Screen';
import { screenBackgrounds } from '../../layout/screen-backgrounds';
import { pickCellTextures } from '../../assets/cellTextures';
import { AccuracyPlayStatusRow } from './AccuracyPlayStatusRow';
import { BoardFrame } from './BoardFrame';
import { BoardGrid } from './BoardGrid';
import { BOARD_HORIZONTAL_SPACING, useBoardLayout } from './boardLayout';
import { PlayResultOverlay } from './PlayResultOverlay';
import { PlayStatusRow } from './PlayStatusRow';
import { ScoreFlightsLayer } from './ScoreFlightsLayer';
import { ScorePlayStatusRow } from './ScorePlayStatusRow';
import { PlayTopBar } from './PlayTopBar';
import { TimePlayStatusRow } from './TimePlayStatusRow';
import type { PlayBoardProps } from './types';
import { useScoreAnimation } from './useScoreAnimation';
import { MAX_STARS, useBoardGame } from './useBoardGame';
import { usePlayResultSubmission } from './usePlayResultSubmission';
import { useStarMultiplier } from './useStarMultiplier';

// A won play's board stays on show this long before the results cover it.
const WON_RESULT_DELAY_MS = 1000;

export function PlayBoard({
  board,
  type,
  player,
  challenge,
  challengeParticipation,
  previousLeaderboard,
}: PlayBoardProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'Play'>>();

  const layout = useBoardLayout(board.size);
  const game = useBoardGame(board, layout.cellSize, {
    autoMarkAroundTargets: type === PlayTypeEnum.time,
    loseOnFirstMistake: type === PlayTypeEnum.accuracy,
  });

  // Other players' times in this challenge, for the time mode's timeline —
  // their average per board, the best comparison there is. Nobody without a
  // time (no wins yet) and not the player themselves.
  const rivalResults = useMemo(
    () =>
      (previousLeaderboard?.leaderboard ?? [])
        .flatMap((entry) =>
          entry.player.id !== player.id && entry.avgTimeMs !== undefined
            ? [{ id: entry.player.id, timeMs: entry.avgTimeMs }]
            : [],
        ),
    [previousLeaderboard, player.id],
  );

  const scoreChipRef = useRef<View>(null);
  const flightsLayerRef = useRef<View>(null);
  const scoreAnimation = useScoreAnimation({
    enabled: type === PlayTypeEnum.score,
    gains: game.scoreGains,
    score: game.score,
    boardSize: board.size,
    cellSize: layout.cellSize,
    gridRef: game.gridRef,
    scoreChipRef,
    layerRef: flightsLayerRef,
  });

  // The results wait for the score to finish counting up (they'd cover the
  // animation), and after a win, for WON_RESULT_DELAY_MS more.
  const isFinished = game.gameState !== 'playing' && !scoreAnimation.isAnimating;
  const [isResultShown, setIsResultShown] = useState(false);
  useEffect(() => {
    if (!isFinished) return;
    if (game.gameState !== 'won') {
      setIsResultShown(true);
      return;
    }
    const timer = setTimeout(() => setIsResultShown(true), WON_RESULT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isFinished, game.gameState]);

  // A won quota play's score is multiplied by the stars left — played out on
  // the results overlay, once it's shown.
  const isScoreWon = type === PlayTypeEnum.score && game.gameState === 'won';
  const finalScore = isScoreWon ? game.score * game.stars : game.score;
  const starRefs = useRef<(View | null)[]>([]);
  const multiplierRef = useRef<View>(null);
  const starFlightsLayerRef = useRef<View>(null);
  const starMultiplier = useStarMultiplier({
    enabled: isScoreWon && isResultShown,
    baseScore: game.score,
    stars: game.stars,
    starRefs,
    multiplierRef,
    layerRef: starFlightsLayerRef,
  });

  usePlayResultSubmission({
    gameState: game.gameState,
    type,
    player,
    boardId: board.id,
    boardSize: board.size,
    challengeParticipation,
    // Accuracy mode keeps neither stars nor score.
    stars: type === PlayTypeEnum.accuracy ? 0 : game.stars,
    score: type === PlayTypeEnum.accuracy ? 0 : finalScore,
    getElapsedMs: game.getElapsedMs,
    getHistory: game.getHistory,
  });

  // Picked once per board so the kind->image mapping and the texture variant
  // don't re-randomize on every re-render (e.g. marking/unmarking a cell).
  const cellTextures = useMemo(() => pickCellTextures(board.cells), [board]);

  // A flawless play — won with every star left (accuracy mode has no stars:
  // winning there already means no mistakes) — goes straight on to the
  // leaderboard; anything else sits through the penalty ad first.
  const isFlawless =
    game.gameState === 'won' && (type === PlayTypeEnum.accuracy || game.stars === MAX_STARS);

  const handleContinueToLeaderboard = () => {
    if (!challenge || !challengeParticipation) return;
    navigation.navigate(isFlawless ? 'Leaderboard' : 'Penalty', {
      challenge,
      challengeParticipation,
      previousLeaderboard,
    });
  };

  const handlePlayNextFree = () => {
    navigation.replace('Play', { playType: PlayTypeEnum.freePlay });
  };

  return (
    <Screen
      background={screenBackgrounds.playBoard}
      // Flying scores and the result go over the whole screen.
      overlay={
        <>
          <ScoreFlightsLayer
            flights={scoreAnimation.flights}
            cellSize={layout.cellSize}
            cellBorderRadius={layout.cellBorderRadius}
            layerRef={flightsLayerRef}
            onArrived={scoreAnimation.onFlightArrived}
            popups={scoreAnimation.popups}
            onPopupDone={scoreAnimation.onPopupDone}
          />
          {isResultShown && (
            <PlayResultOverlay
              isWon={game.gameState === 'won'}
              stars={game.stars}
              maxStars={MAX_STARS}
              foundTargets={game.foundTargets}
              boardSize={board.size}
              type={type}
              elapsedSeconds={game.elapsedSeconds}
              score={isScoreWon ? starMultiplier.displayedScore : game.score}
              hasChallenge={!!challenge}
              starMultiplier={
                isScoreWon
                  ? {
                      value: starMultiplier.multiplier,
                      flights: starMultiplier.flights,
                      onFlightArrived: starMultiplier.onFlightArrived,
                      targetRef: multiplierRef,
                      layerRef: starFlightsLayerRef,
                    }
                  : undefined
              }
              onContinue={handleContinueToLeaderboard}
              onGoHome={() => navigation.popTo('Home')}
              onPlayNext={handlePlayNextFree}
            />
          )}
        </>
      }
    >
      <View style={[styles.container, { paddingVertical: layout.screenPadding }]}>
        <PlayTopBar
          // Accuracy mode doesn't count stars.
          stars={type === PlayTypeEnum.accuracy ? undefined : game.stars}
          maxStars={type === PlayTypeEnum.accuracy ? undefined : MAX_STARS}
          starRefs={starRefs}
          onGiveUp={() => navigation.popTo('Home')}
        />
        {type === PlayTypeEnum.score ? (
          <ScorePlayStatusRow
            foundTargets={game.foundTargets}
            boardSize={board.size}
            score={scoreAnimation.displayedScore}
            scoreChipRef={scoreChipRef}
          />
        ) : type === PlayTypeEnum.time ? (
          <TimePlayStatusRow
            foundTargets={game.foundTargets}
            boardSize={board.size}
            elapsedSeconds={game.elapsedSeconds}
            results={rivalResults}
          />
        ) : type === PlayTypeEnum.accuracy ? (
          <AccuracyPlayStatusRow
            foundTargets={game.foundTargets}
            boardSize={board.size}
            challenge={challenge}
            challengeParticipation={challengeParticipation}
            gameState={game.gameState}
          />
        ) : (
          <PlayStatusRow foundTargets={game.foundTargets} boardSize={board.size} />
        )}
        <BoardFrame layout={layout}>
          <BoardGrid
            size={board.size}
            cells={game.cells}
            cellTextures={cellTextures}
            cellSize={layout.cellSize}
            cellBorderRadius={layout.cellBorderRadius}
            gridRef={game.gridRef}
            panHandlers={game.panHandlers}
            onLayout={game.onGridLayout}
          />
        </BoardFrame>
        <View>
          {
            // Rules and random hints are showed here. Later...
          }
        </View>
        <View>
          {
            /**
             * Ad banner block placeholder for future
             */
          }
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: BOARD_HORIZONTAL_SPACING,
  },
});
