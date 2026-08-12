import { IdentifyPlayerRequest, IPlayerAPI } from '@froggo/common.api.mobile';
import { IdentifyPlayer, identifyPlayerSchema } from '@froggo/common.models';

import { API_BASE_URL } from './api-config';

export class PlayerAPI implements IPlayerAPI {
  async identify(request: IdentifyPlayerRequest): Promise<IdentifyPlayer> {
    const res = await fetch(`${API_BASE_URL}/api/players/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      throw new Error('Failed to identify player');
    }
    return identifyPlayerSchema.parse(await res.json());
  }
}
