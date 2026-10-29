import { DynamicModule, Module } from '@nestjs/common';

import { Configuration } from '../Configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { DatabaseModule } from './database/database.module';
import { PlayersModule } from './players/players.module';
import { PlaysModule } from './plays/plays.module';

@Module({})
export class AppModule {
  static forRoot(configuration: Configuration): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigurationModule.forRoot(configuration),
        AuthModule,
        DatabaseModule,
        PlayersModule,
        PlaysModule,
      ],
      controllers: [AppController],
      providers: [AppService],
    };
  }
}
