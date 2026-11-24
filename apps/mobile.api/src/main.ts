/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { buildConfiguration } from './Configuration';
import { AppModule } from './app/app.module';
import { ASSETS_ROUTE } from './app/assets/assets.options';

const CONFIG_ARG_PREFIX = '--config=';

// The release packer puts the content configuration next to main.js, so a
// container starts with no mounted files; --config and CONFIG_PATH override it.
const CONFIG_PATH_DEFAULT = path.join(__dirname, 'configuration.json');

function resolveConfigPath(): string {
  const arg = process.argv.find((value) => value.startsWith(CONFIG_ARG_PREFIX));
  return arg?.slice(CONFIG_ARG_PREFIX.length) || process.env['CONFIG_PATH'] || CONFIG_PATH_DEFAULT;
}

function loadConfiguration(configPath: string) {
  const raw = fs.readFileSync(configPath, 'utf-8');
  return buildConfiguration(JSON.parse(raw), process.env);
}

async function bootstrap() {
  const configuration = loadConfiguration(resolveConfigPath());

  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(configuration));
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  // Lets the app close its database connection when stopped.
  app.enableShutdownHooks();
  app.enableCors({ origin: configuration.cors?.allowedOrigins ?? true });
  // Asset URLs change with the files' content (see AssetCatalog), so a file
  // can be cached for good.
  app.useStaticAssets(configuration.assets.rootPath, {
    prefix: `${ASSETS_ROUTE}/`,
    index: false,
    dotfiles: 'ignore',
    maxAge: '365d',
    immutable: true,
  });
  const port = process.env['PORT'] || 3001;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
