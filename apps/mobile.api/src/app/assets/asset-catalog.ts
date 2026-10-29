import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { ASSETS_ROUTE, AssetsOptions } from './assets.options';

// URLs of the asset files for the mobile app. Each carries a hash of the
// file's content, so the URL changes whenever the file does — the app can
// cache a file for good, and the files are served as immutable.
export class AssetCatalog {
  private readonly urls = new Map<string, string>();

  constructor(private readonly options: AssetsOptions) {}

  // `relativePath` is the file's path under the assets root, e.g.
  // "avatars/avatar_65_common.png". Throws if there's no such file.
  url(relativePath: string): string {
    let url = this.urls.get(relativePath);
    if (!url) {
      const filePath = path.join(this.options.rootPath, relativePath);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Asset file ${filePath} not found`);
      }
      const version = createHash('sha256')
        .update(fs.readFileSync(filePath))
        .digest('hex')
        .slice(0, 16);
      const base = this.options.publicBaseUrl ?? ASSETS_ROUTE;
      url = `${base}/${encodeURI(relativePath)}?v=${version}`;
      this.urls.set(relativePath, url);
    }
    return url;
  }
}
