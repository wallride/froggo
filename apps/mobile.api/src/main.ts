/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import * as fs from 'node:fs';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { configurationSchema } from './Configuration';
import { AppModule } from './app/app.module';

const CONFIG_ARG_PREFIX = '--config=';

function resolveConfigPath(): string {
  const arg = process.argv.find((value) => value.startsWith(CONFIG_ARG_PREFIX));
  const configPath = arg?.slice(CONFIG_ARG_PREFIX.length) || process.env['CONFIG_PATH'];

  if (!configPath) {
    throw new Error(
      'Configuration file path must be specified explicitly, either via ' +
        '"--config=<path>" or the CONFIG_PATH environment variable',
    );
  }

  return configPath;
}

function loadConfiguration(configPath: string) {
  const raw = fs.readFileSync(configPath, 'utf-8');
  return configurationSchema.parse(JSON.parse(raw));
}

async function bootstrap() {
  const configuration = loadConfiguration(resolveConfigPath());

  const app = await NestFactory.create(AppModule.forRoot(configuration));
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.enableCors({ origin: configuration.cors?.allowedOrigins ?? true });
  const port = process.env['PORT'] || 3001;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
