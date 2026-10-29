import { useEffect } from 'react';
import type { RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  CLONE_COLOR,
  FLIGHT_MS,
  POPUP_COLOR,
  POPUP_MS,
  POPUP_SHADOW_COLOR,
} from './scoreAnimation';
import type { ScoreFlight, ScorePopup } from './useScoreAnimation';
import { fonts } from '@dead-lines-inc/frontend';

interface ScoreFlightCloneProps {
  flight: ScoreFlight;
  size: number;
  borderRadius: number;
  onArrived: (flight: ScoreFlight) => void;
}

// A translucent white silhouette of a cell that, after its delay, flies to
// the score counter — slow off the mark, fast in the middle, slow into the
// counter — and dissolves over the last stretch of the way.
function ScoreFlightClone({ flight, size, borderRadius, onArrived }: ScoreFlightCloneProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      flight.delayMs,
      withTiming(
        1,
        { duration: FLIGHT_MS, easing: Easing.inOut(Easing.cubic) },
        (finished) => {
          if (finished) scheduleOnRN(onArrived, flight);
        },
      ),
    );
    // Flights are never edited, only replaced: this runs once, on takeoff.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    // Invisible until it takes off, i.e. while still waiting its turn.
    opacity:
      progress.value === 0
        ? 0
        : interpolate(progress.value, [0, 0.75, 1], [1, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: flight.fromX + (flight.toX - flight.fromX) * progress.value },
      { translateY: flight.fromY + (flight.toY - flight.fromY) * progress.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.clone, { width: size, height: size, borderRadius }, animatedStyle]}
    />
  );
}

interface ScorePopupTextProps {
  popup: ScorePopup;
  cellSize: number;
  onDone: (popup: ScorePopup) => void;
}

// "+X" that, after its delay, appears over the middle of its cell, floats up
// by 80% of a cell and fades out on the way.
function ScorePopupText({ popup, cellSize, onDone }: ScorePopupTextProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      popup.delayMs,
      withTiming(1, { duration: POPUP_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(onDone, popup);
      }),
    );
    // Popups are never edited, only replaced: this runs once, on appearing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    // Invisible until its turn comes.
    opacity: progress.value === 0 ? 0 : 1 - progress.value,
    transform: [{ translateY: -cellSize * 0.8 * progress.value }],
  }));

  // Three cells wide and centred on its own cell, so "+50" never wraps
  // over a small cell.
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.popup,
        {
          left: popup.x - cellSize,
          top: popup.y,
          width: cellSize * 3,
          height: cellSize,
        },
        animatedStyle,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.popupText, { fontSize: cellSize * (popup.isTarget ? 0.4 : 0.28) }]}
      >
        +{popup.points}
      </Text>
    </Animated.View>
  );
}

interface ScoreFlightsLayerProps {
  flights: ScoreFlight[];
  cellSize: number;
  cellBorderRadius: number;
  // Measured to place flights, which are positioned relative to this layer.
  layerRef: RefObject<View | null>;
  onArrived: (flight: ScoreFlight) => void;
  popups: ScorePopup[];
  onPopupDone: (popup: ScorePopup) => void;
}

// Covers the whole screen above the board, without catching any touches.
export function ScoreFlightsLayer({
  flights,
  cellSize,
  cellBorderRadius,
  layerRef,
  onArrived,
  popups,
  onPopupDone,
}: ScoreFlightsLayerProps) {
  return (
    <View ref={layerRef} collapsable={false} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {flights.map((flight) => (
        <ScoreFlightClone
          key={flight.key}
          flight={flight}
          size={cellSize}
          borderRadius={cellBorderRadius}
          onArrived={onArrived}
        />
      ))}
      {popups.map((popup) => (
        <ScorePopupText key={popup.key} popup={popup} cellSize={cellSize} onDone={onPopupDone} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  clone: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: CLONE_COLOR,
  },
  popup: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupText: {
    fontFamily: fonts.bold,
    color: POPUP_COLOR,
    textShadowColor: POPUP_SHADOW_COLOR,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
});
