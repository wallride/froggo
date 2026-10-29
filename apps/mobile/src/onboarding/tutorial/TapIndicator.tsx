import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

const PULSE_MS = 420;
// Between the two pulses of a double tap.
const DOUBLE_GAP_MS = 60;

interface TapIndicatorProps {
  // Centre of the tapped cell, within the grid.
  x: number;
  y: number;
  size: number;
  double: boolean;
}

// A ring spreading out from where the (imaginary) finger touched the board —
// twice for a double tap. Mount it anew for every tap.
export function TapIndicator({ x, y, size, double }: TapIndicatorProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = () =>
      Animated.timing(progress, { toValue: 1, duration: PULSE_MS, useNativeDriver: true });
    const reset = Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true });
    const animation = double
      ? Animated.sequence([pulse(), reset, Animated.delay(DOUBLE_GAP_MS), pulse()])
      : pulse();
    animation.start();
    return () => animation.stop();
  }, [progress, double]);

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0] }),
          transform: [
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.25] }) },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    pointerEvents: 'none',
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
});
