import { useEffect } from 'react';
import { Image, ImageBackground, ImageSourcePropType, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PlayCell } from '@dead-lines-inc/common.models';
import { kindColors } from '@dead-lines-inc/frontend';

import { CELL_MARGIN } from './boardLayout';
import {
  REVEAL_FROM_OPACITY,
  REVEAL_FROM_SCALE,
  REVEAL_GROW_MS,
  REVEAL_PEAK_SCALE,
  REVEAL_SETTLE_MS,
} from './targetReveal';

// Mounted at the moment the target is found (it's only rendered once the
// cell is revealed), so the animation plays exactly once, on discovery.
function TargetSprite({ size }: { size: number }) {
  const scale = useSharedValue(REVEAL_FROM_SCALE);
  const opacity = useSharedValue(REVEAL_FROM_OPACITY);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(REVEAL_PEAK_SCALE, { duration: REVEAL_GROW_MS, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: REVEAL_SETTLE_MS, easing: Easing.inOut(Easing.quad) }),
    );
    opacity.value = withTiming(1, { duration: REVEAL_GROW_MS });
    // Runs once, when the sprite appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.targetSprite, animatedStyle]}>
      <Image
        source={require('../../../assets/images/cell/targets/target.png')}
        style={{ width: size * 0.95, height: size * 0.95 }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

// A bold cross drawn as two bars, since the ✕ glyph has no heavier weight in
// most fonts: the player's own mark (half see-through black), and a wrong
// guess (red) — the same size, so the two read as the same kind of sign.
function Cross({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  const barStyle = {
    width: size * 0.6,
    height: size * 0.18,
    borderRadius: size * 0.09,
    backgroundColor: color,
  };
  return (
    // Offscreen compositing makes Android apply the opacity to the cross as a
    // whole (iOS and web already do), not to each bar separately.
    <View pointerEvents="none" needsOffscreenAlphaCompositing style={[styles.cross, { opacity }]}>
      <View style={[styles.crossBar, barStyle, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[styles.crossBar, barStyle, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

const MARK_CROSS_COLOR = '#000';
const WRONG_CROSS_COLOR = '#b02';

interface BoardCellProps {
  cell: PlayCell;
  texture: ImageSourcePropType | undefined;
  size: number;
  borderRadius: number;
}

export function BoardCell({ cell, texture, size, borderRadius }: BoardCellProps) {
  const isRevealed = cell.isStated && cell.hasTarget;
  const isWrong = cell.isStated && !cell.hasTarget;
  const isMarked = !cell.isStated && cell.isMarked;

  return (
    <View style={[styles.cell, { width: size, height: size, borderRadius }]}>
      {
        /**
         * pointerEvents="none" on every overlay below is load-bearing, not
         * cosmetic: on the web target, a real touch's touchmove events are
         * captured to the exact DOM node touchstart landed on. If a finger
         * lands on a visible ✕ and that same gesture's grant handler
         * unmarks the cell, the conditionally-rendered ✕ node gets
         * unmounted mid-gesture, silently killing touch capture for the
         * rest of the drag (mouse events don't have this "capture to
         * original target" behavior, which is why this only shows up with
         * real touch input). Keeping these out of hit-testing means
         * touches always land on the stable outer View instead.
         */
      }
      <ImageBackground
        source={texture}
        style={[
          styles.cellBackground,
          {
            backgroundColor: texture ? undefined : kindColors[cell.kind],
          },
        ]}
      >
        {isWrong && <Cross size={size} color={WRONG_CROSS_COLOR} opacity={1} />}
        {isMarked && <Cross size={size} color={MARK_CROSS_COLOR} opacity={0.5} />}
      </ImageBackground>
      {isRevealed && <TargetSprite size={size} />}
      {
        // Rendered last so the inset shadow paints over the background
        // image/content instead of underneath it.
      }
      <View pointerEvents="none" style={[styles.cellShadowOverlay, { borderRadius }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    // Clips the texture background to the rounded corners — an
    // ImageBackground's image isn't clipped to borderRadius by default.
    overflow: 'hidden',
    margin: CELL_MARGIN,
    boxShadow: [
      { offsetX: 0, offsetY: 0, blurRadius: 5, color: 'rgba(255,255,255,0.2)' },
    ],
  },
  // The cell's texture/color background, with the mark/wrong cross on it.
  cellBackground: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A found target's sprite, covering the cell.
  targetSprite: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A separate layer on top of the background image/content — an inset
  // box-shadow painted directly on the cell would land underneath the
  // ImageBackground's image and never show.
  cellShadowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    boxShadow: [
      { offsetX: 0, offsetY: 0, blurRadius: 20, color: 'rgba(0,0,0,0.8)', inset: true },
      { offsetX: 0, offsetY: 0, blurRadius: 2, color: 'rgba(255,255,0,0.9)', inset: false },
      { offsetX: 0, offsetY: 1, blurRadius: 1, color: 'rgba(255,255,255,0.7)', inset: true },
      { offsetX: 0, offsetY: -1, blurRadius: 1, color: 'rgba(0,0,0,0.8)', inset: true },
    ],
  },
  cross: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // Its opacity is set on the container, not the bars, so their overlap in
    // the middle isn't more opaque than the rest.
  },
  // Both bars sit centred on top of each other; each is rotated its own way.
  crossBar: {
    position: 'absolute',
    // A light halo keeps the cross visible on the darkest kind colors.
    boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 2, color: '#fff' }],
  },
});
