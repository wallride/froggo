import * as fs from "node:fs";
import * as path from "node:path";

import * as uuid from 'uuid';

import { IdentifyPlayer, PlayerAuthProviderEnum, identifyPlayerSchema } from "@froggo/common.models";

import { JSONFileProvider } from "../JSONFileProvider";
import { IPlayerProvider } from "./IPlayerProvider";

export class JSONFilePlayerProvider extends JSONFileProvider<IdentifyPlayer> implements IPlayerProvider {
  protected schema = identifyPlayerSchema;

  protected override getFileRootDir(fileName: string): string {
    return path.join(this.options.storage.rootPath, fileName.slice(0, 2));
  }

  protected getIdFileName(id: string): string {
    return `${id}.json`;
  }

  protected override getModelFileName(model: IdentifyPlayer): string {
    return this.getIdFileName(model.id);
  }

  async get(id: string): Promise<IdentifyPlayer | null> {
    try {
      return this.getModelFile(this.getIdFileName(id));
    } catch {
      return null;
    }
  }

  async update(player: IdentifyPlayer): Promise<IdentifyPlayer> {
    return this.save(player);
  }

  async identify(authProvider: PlayerAuthProviderEnum, externalId: string): Promise<IdentifyPlayer> {
    const all = await this.getAll();
    const found = all.find(
      (player) =>
        player.identity.authProvider === authProvider &&
        player.identity.externalId === externalId,
    );
    if (found) return found;

    const created: IdentifyPlayer = {
      id: uuid.v4(),
      name: 'Player',
      avatarId: 'default',
      identity: {
        authProvider,
        externalId,
        createdAt: new Date().toISOString(),
      },
    };

    return this.save(created);
  }

  async getAll(): Promise<IdentifyPlayer[]> {
    const result: IdentifyPlayer[] = [];

    if (!fs.existsSync(this.options.storage.rootPath)) return result;

    for (const dir of fs.readdirSync(this.options.storage.rootPath, {withFileTypes: true})) {
      if (!dir.isDirectory()) continue;

      const dirPath = path.join(this.options.storage.rootPath, dir.name);
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
