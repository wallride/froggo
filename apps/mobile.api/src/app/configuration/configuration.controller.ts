import { Controller, Get, Inject, Query, UsePipes } from '@nestjs/common';

import {
  GetConfigurationRequest,
  getConfigurationRequestSchema,
  IConfigurationAPI,
} from '@dead-lines-inc/common.api.mobile';
import { AvatarAsset, MobileConfiguration } from '@dead-lines-inc/common.models';

import { Configuration } from '../../Configuration';
import { AssetCatalog } from '../assets/asset-catalog';
import { AvatarPool } from '../avatars/avatar-pool';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CONFIGURATION } from './configuration.token';
import { localizeTexts, resolveLanguage } from './localize-texts';

@Controller('configuration')
export class ConfigurationController implements IConfigurationAPI {
  private readonly avatars: AvatarAsset[];

  // Resolved at start, so a missing avatar image stops the API from starting
  // rather than shows up in the app.
  constructor(@Inject(CONFIGURATION) private readonly configuration: Configuration) {
    const assets = new AssetCatalog(configuration.assets);
    this.avatars = new AvatarPool(configuration.avatarPool).avatars.map((avatar) => ({
      ...avatar,
      url: assets.url(`avatars/${avatar.id}`),
    }));
  }

  @Get()
  @UsePipes(new ZodValidationPipe(getConfigurationRequestSchema))
  async getConfiguration(@Query() request: GetConfigurationRequest): Promise<MobileConfiguration> {
    const { api, ads, languages, texts } = this.configuration.mobileConfiguration;
    const language = resolveLanguage(request.language, languages);
    return {
      api,
      ads,
      language,
      languages,
      texts: localizeTexts(language, texts),
      avatars: this.avatars,
    };
  }
}
