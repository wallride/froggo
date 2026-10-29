# Game Mechanics

## Board & find-the-target loop

N×N grid, N from 5 to 15. N targets (souls) are hidden on the board, exactly
one per row and one per column, with no two targets in neighbouring cells
(8-directional adjacency, same constraint shape as the "Queens" puzzle).
Every cell has a `kind` (1..N) identifying which target index may occupy it —
rendered as the cell's colour, a visible region hint. Whether a cell actually
holds a target (`hasTarget`) stays hidden until revealed.

Player interactions on a cell (`PlayCell`, see `Cell.ts`):

- `isMarked` — single-tap, "no target here". A note for the player, no
  direct scoring effect.
- `isStated` — double-tap, "target is here". Wrong if the cell's `hasTarget`
  is false.

## Stars & loss condition

Every play starts with 3 stars. An incorrect `isStated` declaration (target
claimed on a cell without one) costs 1 star. At 0 stars the play is lost.

This applies identically to both game modes below — stars gate whether a
play is won at all, independent of score or time.

## Game modes

All three modes (`PlayTypeEnum`) share the exact same board and target
mechanic above. `score` and `time` differ only in scoring and leaderboard
ranking; `freePlay` opts out of both.

### Score mode (`score`)

- Base score: 1 point per board cell the player did **not** mark
  (`isMarked` stays false) — fewer, more deliberate marks score higher.
- If the player finds every target with zero incorrect `isStated` attempts
  (all 3 stars survive), the base score is multiplied by the number of
  stars remaining (i.e. ×3 for a flawless play).
- Leaderboard rank: sum of `score` across every play the player has
  completed in the current score-type event, descending (higher is better).

### Time mode (`time`)

- No score. A timer runs in seconds from the start of the play.
- Stars still apply — same 3-star loss condition as score mode — but they
  don't affect ranking directly, only whether a play counts as won.
- Goal: find all targets in the least time.
- Leaderboard rank: average `timeMs` across every play the player has
  completed in the current time-type event, ascending (lower is better).

### Free play (`freePlay`)

- Same board and target mechanic, same 3-star loss condition.
- Not counted in any event and never appears on a leaderboard — purely for
  its own sake.
- Intended for playing after a player has already cleared every board in
  the current day's `score`/`time` events, or any time they just want to
  play without it counting.

## Events & leaderboards

Leaderboards are scoped to a **play event** (`PlayEvent`): a daily,
type-specific window with its own ranking. Only `score` and `time` have
events — `PlayEvent.type` (`eventPlayTypeSchema`) excludes `freePlay` at the
model level, since a free play event/leaderboard doesn't exist. Each event
has a fixed, limited set of boards that players work through; a player's
leaderboard position is computed only from plays belonging to that event.
