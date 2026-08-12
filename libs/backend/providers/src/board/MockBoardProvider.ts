import * as uuid from 'uuid';

import { BaseBoard, Board, BoardComplexityEnum, BoardStateEnum } from "@froggo/common.models";

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
    {kind: 1, hasTarget: true}, {kind: 1}, {kind: 1}, {kind: 5, hasTarget: true}, {kind: 5},
    {kind: 1}, {kind: 3}, {kind: 3}, {kind: 3}, {kind: 5},
    {kind: 1}, {kind: 2}, {kind: 3, hasTarget: true}, {kind: 3}, {kind: 5},
    {kind: 2}, {kind: 2}, {kind: 4}, {kind: 3}, {kind: 4, hasTarget: true},
    {kind: 2}, {kind: 2, hasTarget: true}, {kind: 4}, {kind: 4}, {kind: 4},
  ]
};
