// Timing of the quota-mode score animation (see useScoreAnimation).
export const SCORE_COUNT_MS = 500; // counter climbing by the target's points
export const FLIGHT_STAGGER_MS = 20; // between one free cell's clone taking off and the next's
export const FLIGHT_MS = 200; // one clone's flight to the counter
export const CLONE_COLOR = 'rgba(255,255,255,0.1)';
// "+X" over a cell that earned points, rising and fading out — the target's
// as the counter starts climbing, each free cell's as its clone takes off.
export const POPUP_MS = 500;
export const POPUP_COLOR = 'rgba(255,255,255,0.8)';
export const POPUP_SHADOW_COLOR = 'rgba(0,0,0,0.6)';

// Timing of the end-of-play multiplier (see useStarMultiplier): the stars left
// fly to the multiplier one after another, each bumping it by one, then the
// score counts up to the multiplied total.
export const MULTIPLIER_START_DELAY_MS = 300; // the plain score on show before the first star
export const STAR_STAGGER_MS = 150; // between one star taking off and the next
export const STAR_FLIGHT_MS = 400; // one star's flight to the multiplier
export const MULTIPLIER_POP_MS = 100; // the multiplier swelling, then again settling
export const MULTIPLIER_COUNT_MS = 300; // the score counting up to the multiplied total
