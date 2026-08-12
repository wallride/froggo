import * as path from "node:path";

import * as uuid from 'uuid';

import { BaseBoard, Board, BoardComplexityEnum, BoardStateEnum, boardSchema } from "@froggo/common.models";

import { JSONFileProvider } from "../JSONFileProvider";
import fs from "node:fs";

export class JSONFileBoardProvider extends JSONFileProvider<Board> {
  protected schema = boardSchema;

  protected override getFileRootDir(fileName: string): string {
    return path.join(this.options.storage.rootPath, fileName.slice(0, 2));
  }

  protected getIdFileName(id: string): string {
    return `${id}.json`;
  }

  protected override getModelFileName(model: Board): string {
    return this.getIdFileName(model.id);
  }

  async add(board: BaseBoard): Promise<Board> {
    const data: Board = {
      id: board.size.toString(10).padStart(2, '0') + '-' + uuid.v4(),
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

    return this.save(data);
  }

  async get(id: string): Promise<Board | null> {
    return this.getModelFile(this.getIdFileName(id));
  }

  async update(board: Board): Promise<Board> {
    return this.save(board);
  }

  async getAll(): Promise<Board[]> {
    const result: Board[] = [];

    for (const dir of fs.readdirSync(this.options.storage.rootPath, {withFileTypes: true})) {
      if (!dir) continue;
      console.log(dir);
      if (typeof dir.isDirectory !== 'function' || !dir.isDirectory()) continue;
      const {name} = dir;

      const dirPath = path.join(this.options.storage.rootPath, name);
      const filenames = this.getDirectoryFileNames(dirPath);

      for (const filename of filenames) {
        try {
          const model = this.getModelFile(filename);
          result.push(model);
        } catch (e) {
          //todo make logging
        }
      }
    }

    return result;
  }
}
