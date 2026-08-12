import { Inject, Injectable } from '@nestjs/common';

import { player } from '@froggo/backend.providers';
import { IdentifyPlayer } from '@froggo/common.models';
import { IdentifyPlayerRequest, IPlayerAPI } from '@froggo/common.api.mobile';

import { Configuration } from '../../Configuration';
import { CONFIGURATION } from '../configuration/configuration.module';

@Injectable()
export class PlayersService implements IPlayerAPI {
  private readonly playerProvider: player.JSONFilePlayerProvider;

  constructor(@Inject(CONFIGURATION) configuration: Configuration) {
    this.playerProvider = new player.JSONFilePlayerProvider(
      configuration.dependencies.playerProvider,
    );
  }

  identify(request: IdentifyPlayerRequest): Promise<IdentifyPlayer> {
    return this.playerProvider.identify(request.authProvider, request.externalId);
  }
}
