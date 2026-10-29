import { Platform } from 'react-native';

// Mobile browsers (and devtools' device emulation) zoom the page on a
// double-tap / pinch, which breaks a game board that's tapped rapidly. Native
// builds don't need this; on web we lock the viewport scale and drop the
// double-tap gesture.
export function disableWebZoom() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  let viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.name = 'viewport';
    document.head.appendChild(viewport);
  }
  viewport.content =
    'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

  // iOS Safari ignores user-scalable=no; touch-action covers double-tap zoom there.
  const style = document.createElement('style');
  style.textContent = 'html, body { touch-action: manipulation; }';
  document.head.appendChild(style);

  // iOS Safari still pinch-zooms despite the above.
  document.addEventListener('gesturestart', (event) => event.preventDefault());
}
