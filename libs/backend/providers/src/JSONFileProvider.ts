import * as path from "node:path";
import * as fs from "node:fs";

import * as z from 'zod/v4';

export const jsonFileProviderOptionsSchema = z.object({
  storage: z.object({
    rootPath: z.string(),
    filePatternRegExp: z.string().optional(),
  }),
  space: z.number().optional()
});
export type IJSONFileProviderOptions = z.infer<typeof jsonFileProviderOptionsSchema>;

// Base JSON storage functionality
export abstract class JSONFileProvider<T> {
  protected abstract schema: z.Schema<T>;

  constructor(protected readonly options: IJSONFileProviderOptions) {}

  // by default. May be overridden
  protected getFileRootDir(fileName: string): string {
    return this.options.storage.rootPath;
  }

  protected getDirectoryFileNames(dirPath: string): string[] {
    if (!fs.existsSync(dirPath)) throw new Error(`Directory ${dirPath} not found`);

    const regexp = this.options.storage.filePatternRegExp
      ? new RegExp(this.options.storage.filePatternRegExp)
      : undefined;


    const result: string[] = [];

    for (const dir of fs.readdirSync(dirPath, {withFileTypes: true})) {
      if (!dir) continue;
      if (!dir.isFile()) continue;

      const {name} = dir;
      if (regexp && !name.match(regexp)) continue;

      result.push(name);
    }

    return result;
  }

  protected assertFilePath(fileName: string): string {
    const rootPath = this.getFileRootDir(fileName);
    this.assertPath(rootPath);

    return path.join(rootPath, fileName);
  }

  protected assertPath(path: string): void {
    if (fs.existsSync(path)) return;

    fs.mkdirSync(path, {recursive: true});
  }

  protected parse(data: any): T {
    return this.schema.parse(data);
  }

  protected getModelFile(fileName: string): T {
    const filePath = path.join(this.getFileRootDir(fileName), fileName);
    if (!fs.existsSync(filePath)) throw new Error(`File ${filePath} does not exist`);

    return this.schema.parse(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
  }

  protected save(data: T): T {
    const model = this.parse(data);
    const fileName = this.getModelFileName(model);
    const filePath = this.assertFilePath(fileName);

    fs.writeFileSync(filePath, JSON.stringify(model, null, this.options.space));

    return model;
  }

  protected abstract getModelFileName(model: T): string;
}
