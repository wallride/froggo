// What the tutorial shows, step by step. Each step plays its actions on the
// board as the previous steps left it, then starts over, until the player
// goes on. The step's text is the configured onboarding.tutorial.steps[id].

// A cell as [row, column], from the top left.
export type CellAt = [number, number];

export type TutorialAction =
  // A tap: marks the cell as having no soul, or takes the mark off.
  | { tap: 'single'; at: CellAt }
  // A double tap: claims a soul is there — finds it, or is a wrong guess.
  | { tap: 'double'; at: CellAt }
  // Nothing happens for a while, in ms.
  | { pause: number };

export interface TutorialStep {
  id: string;
  actions: TutorialAction[];
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 'board', actions: [] },
  { id: 'findFirst', actions: [{ tap: 'double', at: [1, 2] }] },
  {
    id: 'markNeighbours',
    actions: [
      { tap: 'single', at: [0, 1] },
      { tap: 'single', at: [1, 1] },
      { tap: 'single', at: [2, 1] },
      { tap: 'single', at: [2, 2] },
      { tap: 'single', at: [2, 3] },
      { tap: 'single', at: [1, 3] },
      { tap: 'single', at: [0, 3] },
      { tap: 'single', at: [0, 2] },
    ],
  },
  {
    id: 'markLines',
    actions: [
      { tap: 'single', at: [1, 0] },
      { tap: 'single', at: [1, 4] },
      { tap: 'single', at: [3, 2] },
      { tap: 'single', at: [4, 2] },
    ],
  },
  {
    id: 'findMore',
    actions: [
      { tap: 'double', at: [2, 4] },
      { tap: 'single', at: [0, 4] },
      { tap: 'single', at: [3, 4] },
      { tap: 'single', at: [4, 4] },
      { tap: 'single', at: [2, 0] },
    ],
  },
  {
    id: 'findRest',
    actions: [
      { tap: 'double', at: [3, 1] },
      { tap: 'double', at: [0, 0] },
      { tap: 'double', at: [4, 3] },
    ],
  },
];
