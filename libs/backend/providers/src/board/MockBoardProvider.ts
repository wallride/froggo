import * as uuid from 'uuid';

import { BaseBoard, Board, BoardComplexityEnum, BoardStateEnum } from "@dead-lines-inc/common.models";

import { IBoardProvider } from "./IBoardProvider";

export class MockBoardProvider implements IBoardProvider {
  async add(board: BaseBoard): Promise<Board> {
    return {
      id: uuid.v4(),
      createdAt: new Date().toISOString(),
      complexity: BoardComplexityEnum.easy,
      state: BoardStateEnum.draft,
      ...board,
      stats: {
        avgScore: 0,
        avgStars: 0,
        avgTime: 0,
        playsTotal: 0,
        topTimes: []
      }
    };
  }

  async get(id: string): Promise<Board | null> {
    return mockBoard;
  }

  async update(board: Board): Promise<Board> {
    return board;
  }

  async getAll(): Promise<Board[]> {
    return [mockBoard];
  }
}


const mockBoard: Board = {
  id: uuid.v4(),
  complexity: BoardComplexityEnum.easy,
  state: BoardStateEnum.draft,
  createdAt: new Date().toISOString(),
  size: 5,
  stats: {avgScore: 0, avgStars: 0, avgTime: 0, playsTotal: 0, topTimes: []},
  cells: [
    {key: 1, kind: 1, hasTarget: true}, {key: 2, kind: 1}, {key: 3, kind: 1}, {key: 4, kind: 5, hasTarget: true}, {key: 5, kind: 5},
    {key: 6, kind: 1}, {key: 7, kind: 3}, {key: 8, kind: 3}, {key: 9, kind: 3}, {key: 10, kind: 5},
    {key: 11, kind: 1}, {key: 12, kind: 2}, {key: 13, kind: 3, hasTarget: true}, {key: 14, kind: 3}, {key: 15, kind: 5},
    {key: 16, kind: 2}, {key: 17, kind: 2}, {key: 18, kind: 4}, {key: 19, kind: 3}, {key: 20, kind: 4, hasTarget: true},
    {key: 21, kind: 2}, {key: 22, kind: 2, hasTarget: true}, {key: 23, kind: 4}, {key: 24, kind: 4}, {key: 25, kind: 4},
  ]
};
