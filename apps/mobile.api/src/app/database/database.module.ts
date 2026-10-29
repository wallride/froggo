import { Global, Module, OnApplicationShutdown } from '@nestjs/common';

import { MongoConnection, player } from '@dead-lines-inc/backend.providers';

import { Configuration } from '../../Configuration';
import { CONFIGURATION } from '../configuration/configuration.token';

// The one MongoDB connection of the app, and the storages shared by more
// than one feature module. Their indexes are made sure of at start.
@Global()
@Module({
  providers: [
    {
      provide: MongoConnection,
      inject: [CONFIGURATION],
      useFactory: async (configuration: Configuration) => {
        const connection = new MongoConnection(configuration.dependencies.mongo);
        await connection.connect();
        return connection;
      },
    },
    {
      provide: player.MongoPlayerProvider,
      inject: [MongoConnection, CONFIGURATION],
      useFactory: async (connection: MongoConnection, configuration: Configuration) => {
        const provider = new player.MongoPlayerProvider(
          connection,
          configuration.dependencies.playerProvider,
        );
        await provider.ensureIndexes();
        return provider;
      },
    },
    {
      provide: player.MongoPlayerAvatarsProvider,
      inject: [MongoConnection, CONFIGURATION],
      useFactory: async (connection: MongoConnection, configuration: Configuration) => {
        const provider = new player.MongoPlayerAvatarsProvider(
          connection,
          configuration.dependencies.playerAvatarsProvider,
        );
        await provider.ensureIndexes();
        return provider;
      },
    },
  ],
  exports: [MongoConnection, player.MongoPlayerProvider, player.MongoPlayerAvatarsProvider],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(private readonly connection: MongoConnection) {}

  async onApplicationShutdown(): Promise<void> {
    await this.connection.disconnect();
  }
}
