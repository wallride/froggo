import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';

import { MongoConnection, board, player } from '@dead-lines-inc/backend.providers';

import { Configuration } from '../../Configuration';
import { CONFIGURATION } from '../configuration/configuration.token';
import { maskMongoUri } from '../diagnostics/startup-log';

const logger = new Logger('Database');

interface IndexedProvider {
  ensureIndexes(): Promise<void>;
}

// Runs after the HTTP server is up, not before it: a platform healthcheck asks
// for the port as soon as the container starts, and waiting for MongoDB here
// would leave that port closed — the probe would fail with no trace of why.
// Unreachable database now costs the routes that need it (and a loud log line),
// not the whole process.
async function warmUp(
  connection: MongoConnection,
  providers: IndexedProvider[],
  configuration: Configuration,
): Promise<void> {
  const startedAt = Date.now();
  const target = maskMongoUri(configuration.dependencies.mongo.uri);

  logger.log(`connecting to ${target}`);
  try {
    await connection.connect();
    for (const provider of providers) {
      await provider.ensureIndexes();
    }
    logger.log(`ready: ${target} (${(Date.now() - startedAt).toString(10)}ms)`);
  } catch (error) {
    logger.error(
      `not ready after ${(Date.now() - startedAt).toString(10)}ms: ${target} — ${messageOf(error)}. ` +
        'The app keeps serving; the routes that need the database fail until it is reachable.',
    );
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// The one MongoDB connection of the app, and the storages shared by more
// than one feature module. Their indexes are made sure of in the background,
// see warmUp above.
@Global()
@Module({
  providers: [
    {
      provide: MongoConnection,
      inject: [CONFIGURATION],
      useFactory: (configuration: Configuration) =>
        new MongoConnection(configuration.dependencies.mongo),
    },
    {
      provide: board.MongoBoardProvider,
      inject: [MongoConnection, CONFIGURATION],
      useFactory: (connection: MongoConnection, configuration: Configuration) =>
        new board.MongoBoardProvider(connection, configuration.dependencies.boardProvider),
    },
    {
      provide: player.MongoPlayerProvider,
      inject: [MongoConnection, CONFIGURATION],
      useFactory: (connection: MongoConnection, configuration: Configuration) =>
        new player.MongoPlayerProvider(connection, configuration.dependencies.playerProvider),
    },
    {
      provide: player.MongoPlayerAvatarsProvider,
      inject: [MongoConnection, CONFIGURATION],
      useFactory: (connection: MongoConnection, configuration: Configuration) =>
        new player.MongoPlayerAvatarsProvider(
          connection,
          configuration.dependencies.playerAvatarsProvider,
        ),
    },
    {
      // Instantiating this provider starts the background connection, so the
      // app doesn't have to remember to call it. The factory must not return
      // the promise: Nest awaits what a factory returns, which would put the
      // database back in front of the listening socket.
      provide: 'DatabaseWarmUp',
      inject: [
        MongoConnection,
        board.MongoBoardProvider,
        player.MongoPlayerProvider,
        player.MongoPlayerAvatarsProvider,
        CONFIGURATION,
      ],
      useFactory: (
        connection: MongoConnection,
        boards: board.MongoBoardProvider,
        players: player.MongoPlayerProvider,
        avatars: player.MongoPlayerAvatarsProvider,
        configuration: Configuration,
      ): { started: true } => {
        void warmUp(connection, [boards, players, avatars], configuration);
        return { started: true };
      },
    },
  ],
  exports: [
    MongoConnection,
    board.MongoBoardProvider,
    player.MongoPlayerProvider,
    player.MongoPlayerAvatarsProvider,
  ],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(private readonly connection: MongoConnection) {}

  async onApplicationShutdown(): Promise<void> {
    await this.connection.disconnect();
  }
}
