import { Asset } from 'expo-asset';

import { allCellTextures } from '../assets/cellTextures';

// The images bundled with the app that the first screens and the play board
// show. In a release build they're on the device already and this is quick;
// in development and on web they're downloaded, which is what makes the
// first screens show without images popping in.
const BUNDLED_IMAGES: number[] = [
  require('../../assets/images/invitation-background.jpg'),
  require('../../assets/images/home-background.jpg'),
  require('../../assets/images/logo.png'),
  require('../../assets/images/death.png'),
  require('../../assets/images/score-card-background.jpg'),
  require('../../assets/images/time-card-background.jpg'),
  require('../../assets/images/accuracy-card-background.jpg'),
  require('../../assets/images/free-play-card-background.jpg'),
  require('../../assets/images/playBoardBG.png'),
  require('../../assets/images/scythe_gold_150x150.png'),
  ...(allCellTextures as number[]),
];

// Loads the bundled images, telling how far it's got (0..1). An image that
// fails to load counts as done: it's simply loaded when it's shown.
export async function preloadBundledImages(onProgress: (fraction: number) => void): Promise<void> {
  let settled = 0;
  await Promise.all(
    BUNDLED_IMAGES.map((module) =>
      Asset.fromModule(module)
        .downloadAsync()
        .catch(() => undefined)
        .finally(() => onProgress(++settled / BUNDLED_IMAGES.length)),
    ),
  );
}
