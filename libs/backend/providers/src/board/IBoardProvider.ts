import { BaseBoard, Board } from "@froggo/common.models";

// API provider for Board models. Used by higher level APIs on backend
export interface IBoardProvider {
  add(board: BaseBoard): Promise<Board>;

  get(id: string): Promise<Board | null>;
  update(board: Board): Promise<Board>;

  getAll(): Promise<Board[]>;
}
