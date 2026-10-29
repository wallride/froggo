import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { board } from '@dead-lines-inc/backend.providers';
import { Board, BaseBoard } from '@dead-lines-inc/common.models';
import { IBoardAPI } from '@dead-lines-inc/common.api.admin';

import { Configuration } from '../../Configuration';
import { CONFIGURATION } from '../configuration/configuration.module';

@Injectable()
export class BoardsService implements IBoardAPI {
  private readonly boardProvider: board.JSONFileBoardProvider;

  constructor(@Inject(CONFIGURATION) configuration: Configuration) {
    this.boardProvider = new board.JSONFileBoardProvider(
      configuration.dependencies.boardProvider,
    );
  }

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
