import * as z from 'zod/v4';

import { IBoardAPI } from '@dead-lines-inc/common.api.admin';
import {
  BaseBoard,
  Board,
  baseBoardSchema,
  boardSchema,
} from '@dead-lines-inc/common.models';

import { API_BASE_URL } from './api-config';

export class BoardAPI implements IBoardAPI {
  async add(board: BaseBoard): Promise<Board> {
    const res = await fetch(`${API_BASE_URL}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseBoardSchema.parse(board)),
    });
    return boardSchema.parse(await res.json());
  }

  async getById(id: string): Promise<Board> {
    const res = await fetch(`${API_BASE_URL}/api/boards/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to load board ${id}`);
    }
    return boardSchema.parse(await res.json());
  }

  async update(board: Board): Promise<Board> {
    const res = await fetch(`${API_BASE_URL}/api/boards`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(boardSchema.parse(board)),
    });
    return boardSchema.parse(await res.json());
  }

  async getAll(): Promise<Board[]> {
    const res = await fetch(`${API_BASE_URL}/api/boards`);
    return z.array(boardSchema).parse(await res.json());
  }
}
