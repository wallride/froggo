import { Board, BaseBoard } from '@dead-lines-inc/common.models';

export interface IBoardAPI {
  add(board: BaseBoard): Promise<Board>
  getById(id: string): Promise<Board>
  update(board: Board): Promise<Board>
  getAll(): Promise<Board[]>
}
