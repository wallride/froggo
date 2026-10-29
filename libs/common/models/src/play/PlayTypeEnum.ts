export enum PlayTypeEnum {
  score = 'score', // score-based play
  time = 'time', // time-based play
  accuracy = 'accuracy', // no stars, score or time: the first mistake loses the board
  freePlay = 'freePlay', // unrated play, not counted in any event or leaderboard
}

