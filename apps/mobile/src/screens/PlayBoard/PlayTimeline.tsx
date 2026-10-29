import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts } from '@dead-lines-inc/frontend';

import { TimelineResult, timelineTicksMs, timelineTimeframeMs } from './timelineLayout';

const HEIGHT = 34; // the same as the pills next to it, see pillStyles
const PADDING_X = 8; // keeps the edge markers and tick labels from being clipped
const AXIS_Y = 23; // from the top; the tick labels sit above it
const TICK_HEIGHT = 5;
const LABEL_WIDTH = 30;
const MARKER_SIZE = 10;
const TICK_MS = 1000; // elapsedSeconds advances this often

interface PlayTimelineProps {
  elapsedSeconds: number;
  // Other players' times, to be shown against the player's own.
  results: TimelineResult[];
}

// An axis of seconds from 0 to the slowest time (at least a minute), with
// other players' results on it and the player's own time as a line moving
// along it. Once the player is slower than everyone, the axis rescales to keep
// them at its end. Takes up all the room it's given.
export function PlayTimeline({ elapsedSeconds, results }: PlayTimelineProps) {
  const [width, setWidth] = useState(0);
  const axisWidth = Math.max(0, width - PADDING_X * 2);
  const elapsedMs = elapsedSeconds * 1000;
  const timeframeMs = timelineTimeframeMs(elapsedMs, results);
  const ticks = useMemo(() => timelineTicksMs(timeframeMs, axisWidth), [timeframeMs, axisWidth]);

  // The clock only ticks once a second; gliding to each tick's values over the
  // tick, at constant speed, makes the player and the rescaling continuous.
  const elapsed = useSharedValue(0);
  const timeframe = useSharedValue(timeframeMs);
  const placedRef = useRef(false);
  useEffect(() => {
    if (!width) return;
    if (!placedRef.current) {
      placedRef.current = true;
      elapsed.value = elapsedMs;
      timeframe.value = timeframeMs;
    } else {
      const timing = { duration: TICK_MS, easing: Easing.linear };
      elapsed.value = withTiming(elapsedMs, timing);
      timeframe.value = withTiming(timeframeMs, timing);
    }
    // elapsed and timeframe are stable shared values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, elapsedMs, timeframeMs]);

  return (
    <View style={styles.timeline} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <>
          <View style={styles.axis} />
          {ticks.map((tickMs) => (
            <AtTime key={tickMs} timeMs={tickMs} timeframe={timeframe} axisWidth={axisWidth}>
              {/* No numberOfLines: on web it caps the width at the parent's,
                  which is 0 here, and the label disappears. */}
              <Text style={styles.tickLabel}>{tickMs / 1000}</Text>
              <View style={styles.tick} />
            </AtTime>
          ))}
          {results.map((result) => (
            <AtTime
              key={result.id}
              timeMs={result.timeMs}
              timeframe={timeframe}
              axisWidth={axisWidth}
            >
              <View style={styles.marker} />
            </AtTime>
          ))}
          <AtTime timeMs={elapsed} timeframe={timeframe} axisWidth={axisWidth}>
            <View style={styles.player} />
          </AtTime>
        </>
      )}
    </View>
  );
}

interface AtTimeProps {
  timeMs: number | SharedValue<number>;
  timeframe: SharedValue<number>;
  axisWidth: number;
  children: ReactNode;
}

// A zero-width column at timeMs on the axis; its children centre themselves on it.
function AtTime({ timeMs, timeframe, axisWidth, children }: AtTimeProps) {
  const style = useAnimatedStyle(() => {
    const time = typeof timeMs === 'number' ? timeMs : timeMs.value;
    return {
      transform: [{ translateX: PADDING_X + (time / timeframe.value) * axisWidth }],
    };
  });

  return <Animated.View style={[styles.atTime, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  timeline: {
    flex: 1,
    minWidth: 0,
    height: HEIGHT,
    // On the left it starts at the row's edge, in line with the rest of the
    // screen; on the right it keeps clear of the time chip.
    marginRight: 12,
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  axis: {
    position: 'absolute',
    left: PADDING_X,
    right: PADDING_X,
    top: AXIS_Y,
    height: 1,
    backgroundColor: colors.surfaceBorder,
  },
  atTime: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    overflow: 'visible',
  },
  tick: {
    position: 'absolute',
    top: AXIS_Y - TICK_HEIGHT + 1,
    left: 0,
    width: 1,
    height: TICK_HEIGHT,
    backgroundColor: colors.textMuted,
  },
  tickLabel: {
    fontFamily: fonts.regular,
    position: 'absolute',
    top: 3,
    left: -LABEL_WIDTH / 2,
    width: LABEL_WIDTH,
    textAlign: 'center',
    fontSize: 8,
    lineHeight: 10,
    color: colors.textMuted,
  },
  marker: {
    position: 'absolute',
    top: AXIS_Y - MARKER_SIZE / 2,
    left: -MARKER_SIZE / 2,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: colors.textSecondary,
  },
  // The player's own time: a line across the axis, below the tick labels.
  player: {
    position: 'absolute',
    top: 13,
    bottom: 0,
    left: -1,
    width: 2,
    backgroundColor: colors.accentRush,
  },
});
