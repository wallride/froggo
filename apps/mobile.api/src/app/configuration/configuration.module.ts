import { DynamicModule, Module } from '@nestjs/common';

import { Configuration } from '../../Configuration';
import { ConfigurationController } from './configuration.controller';
import { CONFIGURATION } from './configuration.token';

export { CONFIGURATION };

@Module({})
export class ConfigurationModule {
  static forRoot(configuration: Configuration): DynamicModule {
    return {
      module: ConfigurationModule,
      global: true,
      controllers: [ConfigurationController],
      providers: [{ provide: CONFIGURATION, useValue: configuration }],
      exports: [CONFIGURATION],
    };
  }
}
