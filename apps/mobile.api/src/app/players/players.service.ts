import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { player } from '@dead-lines-inc/backend.providers';
import {
  IdentifyPlayerRequest,
  IdentifyPlayerResponse,
  PlayerProfile,
  PlayerSession,
  SetPlayerAvatarRequest,
  SetPlayerAvatarResponse,
  SetPlayerNameRequest,
} from '@dead-lines-inc/common.api.mobile';
import { IdentifyPlayer, PlayerAuthProviderEnum, PlayerAvatars } from '@dead-lines-inc/common.models';

import { Configuration } from '../../Configuration';
import { PlayerTokens } from '../auth/player-tokens';
import { AvatarPool } from '../avatars/avatar-pool';
import { CONFIGURATION } from '../configuration/configuration.module';
import { toStoredExternalId } from './stored-identity';

// IPlayerAPI on the server: identify() and register() sign the player in,
// the rest act on behalf of the authenticated player.
@Injectable()
export class PlayersService {
  private readonly avatarPool: AvatarPool;

  constructor(
    @Inject(CONFIGURATION) configuration: Configuration,
    private readonly playerTokens: PlayerTokens,
    private readonly playerProvider: player.MongoPlayerProvider,
    private readonly playerAvatarsProvider: player.MongoPlayerAvatarsProvider,
  ) {
    this.avatarPool = new AvatarPool(configuration.avatarPool);
  }

  async identify(request: IdentifyPlayerRequest): Promise<IdentifyPlayerResponse> {
    assertTrustedIdentity(request);
    const { authProvider, externalId } = toStoredIdentity(request);
    const found = await this.playerProvider.findByIdentity(authProvider, externalId);
    return { session: found ? await this.getSession(found) : null };
  }

  async register(request: IdentifyPlayerRequest): Promise<PlayerSession> {
    assertTrustedIdentity(request);
    const { authProvider, externalId } = toStoredIdentity(request);
    const registered =
      (await this.playerProvider.findByIdentity(authProvider, externalId)) ??
      (await this.playerProvider.create(
        authProvider,
        externalId,
        this.avatarPool.pickRandomStarterAvatarId(),
      ));
    return this.getSession(registered);
  }

  async setAvatar(
    playerId: string,
    request: SetPlayerAvatarRequest,
  ): Promise<SetPlayerAvatarResponse> {
    const found = await this.getPlayer(playerId);
    const avatars = await this.getPlayerAvatars(found.id);
    if (!avatars.avatarIds.includes(request.avatarId)) {
      throw new BadRequestException('Avatar is not available to the player');
    }

    const updated = await this.playerProvider.update({ ...found, avatarId: request.avatarId });
    return { avatarId: updated.avatarId, avatars };
  }

  async setName(playerId: string, request: SetPlayerNameRequest): Promise<IdentifyPlayer> {
    const found = await this.getPlayer(playerId);
    return this.playerProvider.update({ ...found, name: request.name });
  }

  async completeOnboarding(playerId: string): Promise<IdentifyPlayer> {
    const found = await this.getPlayer(playerId);
    return found.isOnboarded
      ? found
      : this.playerProvider.update({ ...found, isOnboarded: true });
  }

  private async getSession(found: IdentifyPlayer): Promise<PlayerSession> {
    const profile: PlayerProfile = {
      player: found,
      avatars: await this.getPlayerAvatars(found.id),
    };
    return { ...profile, accessToken: await this.playerTokens.issue(found.id) };
  }

  private async getPlayer(playerId: string): Promise<IdentifyPlayer> {
    const found = await this.playerProvider.get(playerId);
    if (!found) throw new NotFoundException('Player not found');
    return found;
  }

  // The player's record, created with the starter avatars on first access.
  private async getPlayerAvatars(playerId: string): Promise<PlayerAvatars> {
    return (
      (await this.playerAvatarsProvider.get(playerId)) ??
      this.playerAvatarsProvider.update(this.avatarPool.createPlayerAvatars(playerId))
    );
  }
}

// An anonymous player's externalId is a secret only their device knows, so
// presenting it proves who they are. Other providers' account ids are no
// secret: signing in with them needs the provider's token verified, which
// isn't supported yet.
function assertTrustedIdentity({ authProvider }: IdentifyPlayerRequest): void {
  if (authProvider !== PlayerAuthProviderEnum.anonymous) {
    throw new BadRequestException(`Signing in with ${authProvider} is not supported`);
  }
}

function toStoredIdentity({ authProvider, externalId }: IdentifyPlayerRequest): IdentifyPlayerRequest {
  return { authProvider, externalId: toStoredExternalId(authProvider, externalId) };
}
