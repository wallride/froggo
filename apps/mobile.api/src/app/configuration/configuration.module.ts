import { DynamicModule, Module } from '@nestjs/common';

import { Configuration } from '../../Configuration';

export const CONFIGURATION = Symbol('CONFIGURATION');

@Module({})
export class ConfigurationModule {
  static forRoot(configuration: Configuration): DynamicModule {
    return {
      module: ConfigurationModule,
      global: true,
      providers: [{ provide: CONFIGURATION, useValue: configuration }],
      exports: [CONFIGURATION],
    };
  }
}
