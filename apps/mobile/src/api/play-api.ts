import * as z from 'zod/v4';

import {
  AcceptPlayResultsRequest,
  getActiveChallengesResponseSchema,
  GetLeaderboardRequest,
  getLeaderboardResponseSchema,
  GetLeaderboardResponse,
  IPlayAPI,
  JoinChallengeRequest,
  joinChallengeResponseSchema,
  JoinChallengeResponse,
  startPlayResponseSchema,
  StartPlayResponse,
  StartPlayRequest,
} from '@dead-lines-inc/common.api.mobile';

import { MobileApiConfiguration } from '@dead-lines-inc/common.models';

import { apiUrl } from './api-url';
import { authSession } from './auth-session';

export class PlayAPI implements IPlayAPI {
  constructor(private readonly api: MobileApiConfiguration) {}

  async getActiveChallenges() {
    const res = await authSession.fetch(apiUrl(this.api, 'activeChallenges'));
    if (!res.ok) {
      throw new Error('Failed to load active challenges');
    }
    return z.array(getActiveChallengesResponseSchema).parse(await res.json());
  }

  async joinChallenge(request: JoinChallengeRequest): Promise<JoinChallengeResponse> {
    const res = await authSession.fetch(apiUrl(this.api, 'joinChallenge'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      throw new Error('Failed to join challenge');
    }
    return joinChallengeResponseSchema.parse(await res.json());
  }

  async startPlay(request: StartPlayRequest): Promise<StartPlayResponse> {
    const res = await authSession.fetch(apiUrl(this.api, 'startPlay'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      throw new Error('Failed to start play');
    }
    return startPlayResponseSchema.parse(await res.json());
  }

  async acceptPlayResults(request: AcceptPlayResultsRequest): Promise<void> {
    const res = await authSession.fetch(apiUrl(this.api, 'acceptPlayResults'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      throw new Error('Failed to submit play results');
    }
  }

  async getLeaderboard(request: GetLeaderboardRequest): Promise<GetLeaderboardResponse> {
    const query = new URLSearchParams({ challengeId: request.challengeId });
    const res = await authSession.fetch(`${apiUrl(this.api, 'leaderboard')}?${query}`);
    if (!res.ok) {
      throw new Error('Failed to load leaderboard');
    }
    return getLeaderboardResponseSchema.parse(await res.json());
  }
}
