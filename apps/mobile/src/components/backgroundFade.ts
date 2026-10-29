import { Platform } from 'react-native';

// A vertical fade from transparent to `color` (6-digit hex). Native takes it
// as experimental_backgroundImage; react-native-web passes styles through as
// CSS, where it's plain backgroundImage.
export function backgroundFade(color: string) {
  const gradient = `linear-gradient(to bottom, ${color}00, ${color})`;
  return Platform.OS === 'web'
    ? ({ backgroundImage: gradient } as object)
    : { experimental_backgroundImage: gradient };
}
