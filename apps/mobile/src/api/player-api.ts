import {
  IdentifyPlayerRequest,
  IdentifyPlayerResponse,
  identifyPlayerResponseSchema,
  IPlayerAPI,
  PlayerSession,
  playerSessionSchema,
  SetPlayerAvatarRequest,
  SetPlayerAvatarResponse,
  setPlayerAvatarResponseSchema,
  SetPlayerNameRequest,
} from '@dead-lines-inc/common.api.mobile';
import { IdentifyPlayer, identifyPlayerSchema, MobileApiConfiguration } from '@dead-lines-inc/common.models';

import { apiUrl } from './api-url';
import { authSession } from './auth-session';

export class PlayerAPI implements IPlayerAPI {
  constructor(private readonly api: MobileApiConfiguration) {}

  async identify(request: IdentifyPlayerRequest): Promise<IdentifyPlayerResponse> {
    const res = await fetch(apiUrl(this.api, 'identifyPlayer'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      throw new Error('Failed to identify player');
    }
    return identifyPlayerResponseSchema.parse(await res.json());
  }

  async register(request: IdentifyPlayerRequest): Promise<PlayerSession> {
    const res = await fetch(apiUrl(this.api, 'registerPlayer'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      throw new Error('Failed to register player');
    }
    return playerSessionSchema.parse(await res.json());
  }

  async setAvatar(request: SetPlayerAvatarRequest): Promise<SetPlayerAvatarResponse> {
    const res = await authSession.fetch(apiUrl(this.api, 'setPlayerAvatar'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      throw new Error('Failed to set player avatar');
    }
    return setPlayerAvatarResponseSchema.parse(await res.json());
  }

  async completeOnboarding(): Promise<IdentifyPlayer> {
    const res = await authSession.fetch(apiUrl(this.api, 'completeOnboarding'), {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error('Failed to complete onboarding');
    }
    return identifyPlayerSchema.parse(await res.json());
  }

  async setName(request: SetPlayerNameRequest): Promise<IdentifyPlayer> {
    const res = await authSession.fetch(apiUrl(this.api, 'setPlayerName'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      throw new Error('Failed to set player name');
    }
    return identifyPlayerSchema.parse(await res.json());
  }
}
