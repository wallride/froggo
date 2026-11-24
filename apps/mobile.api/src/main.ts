/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { MongoConnection } from '@dead-lines-inc/backend.providers';
import { buildConfiguration } from './Configuration';
import { AppModule } from './app/app.module';
import { ASSETS_ROUTE } from './app/assets/assets.options';
import { accessLog } from './app/diagnostics/access-log.middleware';
import type { HttpResponseLike } from './app/diagnostics/http-types';
import {
  describeConfiguration,
  describeListenAddress,
  describeNetwork,
} from './app/diagnostics/startup-log';
import type { DatabaseState } from './app/health/liveness';
import { liveness } from './app/health/liveness';

const CONFIG_ARG_PREFIX = '--config=';

// The release packer puts the content configuration next to main.js, so a
// container starts with no mounted files; --config and CONFIG_PATH override it.
const CONFIG_PATH_DEFAULT = path.join(__dirname, 'configuration.json');

// The global prefix leaves the root to the platform's probes.
const GLOBAL_PREFIX = 'api';

// Inside a container nothing arrives over loopback only, and the platform's
// proxy reaches the process over the network interface.
const LISTEN_HOST = '0.0.0.0';

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
  Logger.log(describeConfiguration(configuration), 'Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(configuration));

  // Before any route: every request the process gets leaves a line in the log,
  // including the probes and the paths nothing answers.
  app.use(accessLog);

  app.setGlobalPrefix(GLOBAL_PREFIX);
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

  // The API lives under /api, but platforms probe liveness on "/" (or
  // "/health") and a 404 there is indistinguishable from a dead process.
  const httpServer = app.getHttpAdapter().getInstance();
  const connection = app.get(MongoConnection, { strict: false });
  const databaseState = (): DatabaseState =>
    connection.isConnected() ? 'connected' : 'disconnected';
  const answerLiveness = (
    _request: unknown,
    response: HttpResponseLike,
  ): void => {
    response.status(200).json(liveness(databaseState()));
  };
  httpServer.get('/', answerLiveness);
  httpServer.get('/health', answerLiveness);

  const port = process.env['PORT'] || 3001;
  await app.listen(port, LISTEN_HOST);
  Logger.log(
    `listening on ${describeListenAddress(app.getHttpServer())} (PORT=${process.env['PORT'] ?? 'unset'}), api at /${GLOBAL_PREFIX}`,
    'Bootstrap',
  );
  Logger.log(describeNetwork(), 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  Logger.error(
    `startup failed: ${message}`,
    error instanceof Error ? error.stack : undefined,
    'Bootstrap',
  );
  process.exit(1);
});
