import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { board } from '@dead-lines-inc/backend.providers';
import { Board, BaseBoard } from '@dead-lines-inc/common.models';
import { IBoardAPI } from '@dead-lines-inc/common.api.admin';

@Injectable()
export class BoardsService implements IBoardAPI {
  constructor(private readonly boardProvider: board.MongoBoardProvider) {}

  add(board: BaseBoard): Promise<Board> {
    return this.boardProvider.add(board);
  }

  async getById(id: string): Promise<Board> {
    const found = await this.boardProvider.get(id);
    if (!found) {
      throw new NotFoundException(`Board ${id} not found`);
    }
    return found;
  }

  update(board: Board): Promise<Board> {
    return this.boardProvider.update(board);
  }

  getAll(): Promise<Board[]> {
    return this.boardProvider.getAll();
  }
}
