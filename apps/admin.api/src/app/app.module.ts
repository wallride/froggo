import { DynamicModule, Module } from '@nestjs/common';

import { Configuration } from '../Configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BoardsModule } from './boards/boards.module';
import { ConfigurationModule } from './configuration/configuration.module';

@Module({})
export class AppModule {
  static forRoot(configuration: Configuration): DynamicModule {
    return {
      module: AppModule,
      imports: [ConfigurationModule.forRoot(configuration), BoardsModule],
      controllers: [AppController],
      providers: [AppService],
    };
  }
}
