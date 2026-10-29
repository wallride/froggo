import { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { STAR_FLIGHT_MS } from './scoreAnimation';
import type { StarFlight } from './useStarMultiplier';

interface MultiplierStarFlightProps {
  flight: StarFlight;
  onArrived: (flight: StarFlight) => void;
}

// A copy of a top bar star flying to the multiplier: swelling a little on the way
// up, shrinking into the multiplier as it lands.
export function MultiplierStarFlight({ flight, onArrived }: MultiplierStarFlightProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: STAR_FLIGHT_MS, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        if (finished) scheduleOnRN(onArrived, flight);
      },
    );
    // Remounted per flight (keyed by step): this runs once, on takeoff.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: flight.fromX + (flight.toX - flight.fromX) * progress.value },
      { translateY: flight.fromY + (flight.toY - flight.fromY) * progress.value },
      { scale: interpolate(progress.value, [0, 0.4, 1], [1, 1.5, 0.6]) },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.star, { width: flight.size, height: flight.size }, animatedStyle]}
    >
      <Image
        source={require('../../../assets/images/scythe_gold_150x150.png')}
        style={{ width: flight.size, height: flight.size }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
