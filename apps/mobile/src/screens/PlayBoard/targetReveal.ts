// A found soul's appearance (BoardCell): pops in from small and half
// see-through, grows past its size, then settles back.
export const REVEAL_FROM_SCALE = 0.3;
export const REVEAL_FROM_OPACITY = 0.5;
export const REVEAL_PEAK_SCALE = 1.2;
export const REVEAL_GROW_MS = 240;
export const REVEAL_SETTLE_MS = 160;
// The whole of it — the score animation waits this long before it starts.
export const REVEAL_MS = REVEAL_GROW_MS + REVEAL_SETTLE_MS;
