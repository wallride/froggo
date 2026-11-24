import { Global, Module, OnApplicationShutdown } from '@nestjs/common';

import { MongoConnection, board } from '@dead-lines-inc/backend.providers';

import { Configuration } from '../../Configuration';
import { CONFIGURATION } from '../configuration/configuration.module';

// The one MongoDB connection of the app and the board storage it serves. The
// boards collection is shared with mobile.api, so the index is made sure of
// here as well.
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
      provide: board.MongoBoardProvider,
      inject: [MongoConnection, CONFIGURATION],
      useFactory: async (connection: MongoConnection, configuration: Configuration) => {
        const provider = new board.MongoBoardProvider(
          connection,
          configuration.dependencies.boardProvider,
        );
        await provider.ensureIndexes();
        return provider;
      },
    },
  ],
  exports: [MongoConnection, board.MongoBoardProvider],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(private readonly connection: MongoConnection) {}

  async onApplicationShutdown(): Promise<void> {
    await this.connection.disconnect();
  }
}
