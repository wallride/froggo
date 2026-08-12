import { Board, BaseBoard } from '@froggo/common.models';

export interface IBoardAPI {
  add(board: BaseBoard): Promise<Board>
  getById(id: string): Promise<Board>
  update(board: Board): Promise<Board>
  getAll(): Promise<Board[]>
}
