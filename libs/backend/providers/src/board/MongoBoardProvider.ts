import * as uuid from 'uuid';

import {
  BaseBoard,
  Board,
  BoardComplexityEnum,
  BoardStateEnum,
  boardSchema,
} from '@dead-lines-inc/common.models';

import { MongoProvider } from '../MongoProvider';
import { IBoardProvider } from './IBoardProvider';

// Boards in a MongoDB collection. New ids keep the "<size>-<uuid>" shape the
// file storage used: challenges refer to boards by id, so ids made before the
// move stay valid and are never reissued.
export class MongoBoardProvider extends MongoProvider<Board> implements IBoardProvider {
  protected schema = boardSchema;

  protected getModelId(model: Board): string {
    return model.id;
  }

  // Boards are looked up by id and listed in full on every play start. Safe to
  // call on every start.
  async ensureIndexes(): Promise<void> {
    await this.collection.createIndex({ id: 1 }, { unique: true });
  }

  async add(board: BaseBoard): Promise<Board> {
    return this.save({
      id: `${board.size.toString(10).padStart(2, '0')}-${uuid.v4()}`,
      createdAt: new Date().toISOString(),
      complexity: BoardComplexityEnum.easy,
      state: BoardStateEnum.draft,
      ...board,
      stats: {
        avgScore: 0,
        avgStars: 0,
        avgTime: 0,
        playsTotal: 0,
        topTimes: [],
      },
    });
  }

  async get(id: string): Promise<Board | null> {
    return this.findModel(id);
  }

  async update(board: Board): Promise<Board> {
    return this.save(board);
  }

  async getAll(): Promise<Board[]> {
    return this.findModels();
  }
}
