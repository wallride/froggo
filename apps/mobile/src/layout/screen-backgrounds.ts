import type { ImageSourcePropType } from 'react-native';

import { colors } from '@dead-lines-inc/frontend';

// Art behind a screen (see Screen).
export interface ScreenBackground {
  source: ImageSourcePropType;
  // The art's height to its width. With it, the art is scaled to the screen
  // width and pinned to the top, the rest of the screen filled with `color`.
  // Without it, the art covers the whole screen.
  aspect?: number;
  // How much of the art, from its bottom edge up, fades into `color` so
  // there's no visible edge. Only with `aspect`.
  fade?: number;
  // Under and below the art. Picked to match the art's bottom edge (6-digit
  // hex, for the fade).
  color: string;
}

export const screenBackgrounds = {
  // The startup screen and the invitation share it, so one turns into the
  // other seamlessly. Its color is the average of the art's lowest 4% of rows.
  invitation: {
    source: require('../../assets/images/invitation-background.jpg'),
    aspect: 1536 / 1024,
    fade: 0.25,
    color: '#060710',
  },
  home: {
    source: require('../../assets/images/home-background.jpg'),
    aspect: 1536 / 1024,
    color: colors.background,
  },
  leaderboard: {
    source: require('../../assets/images/leaderboard-background.jpg'),
    aspect: 1844 / 853,
    color: '#070b17',
  },
  playBoard: {
    source: require('../../assets/images/playBoardBG.png'),
    color: colors.background,
  },
} satisfies Record<string, ScreenBackground>;
