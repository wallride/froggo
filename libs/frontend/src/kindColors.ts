// Indexed by cell kind (0 = no kind yet), so kinds are positional: a board of
// size n uses kinds 1..n. Boards are capped at MAX_BOARD_SIZE (12) kinds — the
// colors past that are commented out, to pick which ones to keep or drop.
export const kindColors = [
  "#FFFFFF", // kind 0: blank cell
  "#920000",
  "#f77350",
  "#71620C",
  "#a7b12E",
  "#3D8A01",
  "#29aEa5",
  "#0B5Ea4",
  "#262A84",
  "#6041aF",
  "#C946dB",
  "#C8445B",
  "#d0d0d0",
  // Beyond MAX_BOARD_SIZE, unused for now:
  // "#404040", // kind 13
  // "#B0C9FF", // kind 14
  // "#1E4D73", // kind 15
  // "#8CA03D", // kind 16
]
