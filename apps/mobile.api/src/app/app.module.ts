import { DynamicModule, Module } from '@nestjs/common';

import { Configuration } from '../Configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigurationModule } from './configuration/configuration.module';
import { PlayersModule } from './players/players.module';

@Module({})
export class AppModule {
  static forRoot(configuration: Configuration): DynamicModule {
    return {
      module: AppModule,
      imports: [ConfigurationModule.forRoot(configuration), PlayersModule],
      controllers: [AppController],
      providers: [AppService],
    };
  }
}
