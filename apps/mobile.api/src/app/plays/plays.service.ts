import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import moment from 'moment';

import { board, player, play, MongoConnection } from '@dead-lines-inc/backend.providers';
import { Board, challenges, PlayTypeEnum } from '@dead-lines-inc/common.models';
import {
  AcceptPlayResultsRequest,
  GetActiveChallengesResponse,
  GetLeaderboardRequest,
  GetLeaderboardResponse,
  JoinChallengeRequest,
  JoinChallengeResponse,
  StartPlayResponse,
  StartPlayRequest,
} from '@dead-lines-inc/common.api.mobile';

import { Configuration } from '../../Configuration';
import { AvatarPool } from '../avatars/avatar-pool';
import { CONFIGURATION } from '../configuration/configuration.module';
import { BoardTransformer } from './board-transformer';
import { ChallengeBots } from './challenge-bots';

const SCORE_PLAY_TARGET_FOUND = 50;
const SCORE_PLAY_FREE_CELLS = 1;

const CHALLENGE_TYPES = [PlayTypeEnum.score, PlayTypeEnum.time, PlayTypeEnum.accuracy] as const;

// IPlayAPI on the server, acting on behalf of the authenticated player.
@Injectable()
export class PlaysService {
  private readonly boardProvider: board.JSONFileBoardProvider;
  private readonly challengeProvider: play.MongoChallengeProvider;
  private readonly participationProvider: play.MongoChallengeParticipationProvider;
  private readonly playHistoryProvider: play.MongoPlayHistoryProvider;
  private readonly playProvider: play.MongoPlayProvider;
  private readonly boardTransformer: BoardTransformer;
  private readonly maxChallengeParticipators: number;
  private readonly challengeDuration: Configuration['challengeDuration'];
  private readonly challengeBots: ChallengeBots;

  constructor(
    @Inject(CONFIGURATION) configuration: Configuration,
    mongoConnection: MongoConnection,
    private readonly playerProvider: player.MongoPlayerProvider,
  ) {
    this.boardProvider = new board.JSONFileBoardProvider(
      configuration.dependencies.boardProvider,
    );

    this.challengeProvider = new play.MongoChallengeProvider(
      mongoConnection,
      configuration.dependencies.challengeProvider,
    );
    this.participationProvider = new play.MongoChallengeParticipationProvider(
      mongoConnection,
      configuration.dependencies.challengeParticipationProvider,
      this.playerProvider,
    );
    this.playHistoryProvider = new play.MongoPlayHistoryProvider(
      mongoConnection,
      configuration.dependencies.playHistoryProvider,
    );
    this.playProvider = new play.MongoPlayProvider(
      mongoConnection,
      configuration.dependencies.playProvider,
    );
    this.boardTransformer = new BoardTransformer();
    this.maxChallengeParticipators = configuration.maxChallengeParticipators;
    this.challengeDuration = configuration.challengeDuration;
    this.challengeBots = new ChallengeBots(
      configuration.challengeBots,
      this.maxChallengeParticipators,
      this.playerProvider,
      this.participationProvider,
      this.playProvider,
      new AvatarPool(configuration.avatarPool),
    );
  }


  // Starting any play — free or in any challenge — counts as the player
  // being active in all their ongoing challenges.
  async startPlay(playerId: string, request: StartPlayRequest): Promise<StartPlayResponse> {
    const response = await this.pickPlay(playerId, request);
    await this.participationProvider.touchUnfinished(playerId, new Date().toISOString());
    return response;
  }

  private async pickPlay(
    playerId: string,
    { challengeId }: StartPlayRequest,
  ): Promise<StartPlayResponse> {
    if (!challengeId) {
      // Not a challenge play, just pick a random board.
      const boards = await this.boardProvider.getAll();
      if (boards.length === 0) {
        throw new NotFoundException('No boards available');
      }

      const board = boards[Math.floor(Math.random() * boards.length)];
      return {
        board: this.boardTransformer.transform(board),
        scoresGained: {
          perTarget: SCORE_PLAY_TARGET_FOUND,
          perEachFreeCell: SCORE_PLAY_FREE_CELLS,
        }
      };
    }

    // Pick a board from challenge
    await this.challengeProvider.finishExpired();
    const challenge = await this.challengeProvider.get(challengeId);
    if (challenge.status !== challenges.ChallengeStatusEnum.active) {
      throw new BadRequestException('Challenge is finished');
    }
    const [joined] = await this.participationProvider.getForChallenges(playerId, [challenge]);
    // start participation
    const participation = joined ?? await this.participationProvider.participate(playerId, challenge);

    // Pick a board from the ones not played yet in this challenge.
    const availableBoardIds = await this.getRemainingBoardIds(challenge, participation);
    if (availableBoardIds.length === 0) {
      throw new NotFoundException('No more boards available in challenge');
    }
    const pickedBoardId = availableBoardIds[0];

    const board =  await this.boardProvider.get(pickedBoardId);
    if (!board) throw new NotFoundException(`Board ${pickedBoardId} not found`);

    return {
      board: this.boardTransformer.transform(board),
      scoresGained: {
        perTarget: SCORE_PLAY_TARGET_FOUND,
        perEachFreeCell: SCORE_PLAY_FREE_CELLS,
      },
      challengeParticipation: participation,
    };
  }

  // Saves every finished play, then recalculates the challenge
  // participation it belongs to from all of its plays (freePlay/non-challenge
  // plays have no participation to update, so they're skipped for that
  // part). Plays are saved by id, so resubmitting one doesn't count it twice.
  // Nothing is saved unless every play is the player's own.
  async acceptPlayResults(playerId: string, request: AcceptPlayResultsRequest): Promise<void> {
    for (const { play, history } of request.plays) {
      await this.assertOwnPlay(playerId, play, history);
    }

    for (const { play, history } of request.plays) {
      await this.playProvider.add(play);
      await this.playHistoryProvider.add(history);

      const { challengeParticipation } = play;
      if (challengeParticipation) {
        const participation = await this.participationProvider.get(challengeParticipation.id);
        const challenge = await this.challengeProvider.get(participation.challenge.id);
        const plays = await this.playProvider.getForChallengeParticipation(participation.id);
        await this.participationProvider.updateResults(participation, challenge, plays);
      }

      // Any play counts as the player being active in all their ongoing
      // challenges, not just the one it belongs to.
      await this.participationProvider.touchUnfinished(playerId, play.playedAt);
    }
  }

  // The play, its history and the challenge participation it's for must all
  // be the player's — and a play saved before (by its id) too, so a play
  // can't be overwritten by anyone else.
  private async assertOwnPlay(
    playerId: string,
    submitted: AcceptPlayResultsRequest['plays'][number]['play'],
    history: AcceptPlayResultsRequest['plays'][number]['history'],
  ): Promise<void> {
    if (submitted.player.id !== playerId) {
      throw new ForbiddenException(`Play ${submitted.id} is not the player's`);
    }
    if (history.play.id !== submitted.id) {
      throw new BadRequestException(`History of play ${history.play.id} came with play ${submitted.id}`);
    }

    const saved = await this.playProvider.get(submitted.id);
    if (saved && saved.player.id !== playerId) {
      throw new ForbiddenException(`Play ${submitted.id} is not the player's`);
    }

    const { challengeParticipation } = submitted;
    if (challengeParticipation) {
      const participation = await this.participationProvider.get(challengeParticipation.id);
      if (
        participation.player.id !== playerId ||
        participation.challenge.id !== challengeParticipation.challenge.id
      ) {
        throw new NotFoundException(`Challenge participation ${challengeParticipation.id} not found`);
      }
    }
  }

  // Ranks every participant in a challenge, plus which of the challenge's
  // boards the player hasn't played yet (drives whether "Play next" makes
  // sense for them).
  async getLeaderboard(
    playerId: string,
    request: GetLeaderboardRequest,
  ): Promise<GetLeaderboardResponse> {
    const challenge = await this.challengeProvider.get(request.challengeId);
    const leaderboard = await this.participationProvider.getAllForChallenge(challenge);

    // Score challenges rank highest score first; time challenges rank
    // fastest average time first, players with no win yet last; accuracy
    // challenges rank most boards won first.
    leaderboard.sort((a, b) => {
      switch (challenge.type) {
        case PlayTypeEnum.time:
          return (a.avgTimeMs ?? Infinity) - (b.avgTimeMs ?? Infinity);
        case PlayTypeEnum.accuracy:
          return b.boardsWon - a.boardsWon;
        default:
          return b.score - a.score;
      }
    });

    const viewerParticipation = leaderboard.find((p) => p.player.id === playerId);
    const remainingBoardIds = await this.getRemainingBoardIds(challenge, viewerParticipation);

    return {
      leaderboard: {
        challenge: { id: challenge.id, type: challenge.type },
        leaderboard,
      },
      remainingBoardIds,
    };
  }

  // One challenge per type for the player, with their participation in it:
  // the latest one they haven't finished with (confirmed the result of) yet —
  // even if it's over or all its boards are played — otherwise they join
  // (as new) the latest one as long as it has room for another participant,
  // otherwise a freshly started one.
  async getActiveChallenges(playerId: string): Promise<GetActiveChallengesResponse[]> {
    const player = await this.playerProvider.get(playerId);
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // Expired challenges must not be offered to anyone new.
    await this.challengeProvider.finishExpired();

    const unfinished = await this.participationProvider.getUnfinished(player.id);
    const unfinishedChallenges = await this.challengeProvider.getMany(
      unfinished.map((participation) => participation.challenge.id),
    );
    const joined = unfinished.flatMap((participation) => {
      const challenge = unfinishedChallenges.find((c) => c.id === participation.challenge.id);
      return challenge ? [{ ...challenge, participation }] : [];
    });
    const joinedChallengeIds = await this.participationProvider.getJoinedChallengeIds(player.id);
    const result: GetActiveChallengesResponse[] = [];
    let boardsMap: Promise<Map<number, Board[]>> | undefined;
    const getBoardsMap = () => (boardsMap ??= this.getBoardsBySize());

    for (const type of CHALLENGE_TYPES) {
      const [latestJoined] = joined
        .filter((challenge) => challenge.type === type)
        .sort((a, b) => b.startAt.localeCompare(a.startAt));
      if (latestJoined) {
        result.push(latestJoined);
        continue;
      }

      const challenge = await this.findOrStartChallenge(type, joinedChallengeIds, getBoardsMap);
      if (!challenge) continue;
      // Every challenge shown to the player comes with their participation.
      const participation = await this.participationProvider.participate(player.id, challenge);
      result.push({ ...challenge, participation });
    }

    return result;
  }

  // Confirms the player's result in their finished challenge of the type
  // (its participation becomes finished), then joins them to a challenge
  // with room for them, or a freshly started one.
  async joinChallenge(
    playerId: string,
    { type }: JoinChallengeRequest,
  ): Promise<JoinChallengeResponse> {
    const player = await this.playerProvider.get(playerId);
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    await this.challengeProvider.finishExpired();

    const unfinished = await this.participationProvider.getUnfinished(player.id);
    const leaving = (await this.challengeProvider.getMany(
      unfinished.map((participation) => participation.challenge.id),
    )).filter((challenge) => challenge.type === type);
    if (leaving.some((challenge) => challenge.status !== challenges.ChallengeStatusEnum.finished)) {
      throw new BadRequestException('Challenge is not finished yet');
    }
    for (const participation of unfinished) {
      if (leaving.some((challenge) => challenge.id === participation.challenge.id)) {
        await this.participationProvider.finish(participation);
      }
    }

    const joinedChallengeIds = await this.participationProvider.getJoinedChallengeIds(player.id);
    const challenge = await this.findOrStartChallenge(
      type,
      joinedChallengeIds,
      () => this.getBoardsBySize(),
    );
    if (!challenge) {
      throw new NotFoundException('No boards available');
    }

    const participation = await this.participationProvider.participate(player.id, challenge);
    return { ...challenge, participation };
  }

  // The latest active challenge of the type the player hasn't joined yet, as
  // long as it has room for another participant, otherwise a freshly started
  // one. Null when there are no boards at all to start one with.
  private async findOrStartChallenge(
    type: challenges.Challenge['type'],
    joinedChallengeIds: string[],
    getBoardsMap: () => Promise<Map<number, Board[]>>,
  ): Promise<challenges.Challenge | null> {
    // A challenge without boards can't be played, and one the player has
    // already been through has nothing left for them.
    const latest = await this.challengeProvider.getLatest(type);
    if (
      latest &&
      latest.boardIds.length > 0 &&
      !joinedChallengeIds.includes(latest.id) &&
      await this.participationProvider.countForChallenge(latest) < this.maxChallengeParticipators
    ) {
      return latest;
    }

    const boardsMap = await getBoardsMap();
    const boardIds = this.pickChallengeBoardIds(boardsMap);
    // No boards at all: nothing to play, so no challenge either.
    if (boardIds.length === 0) return null;

    const now = moment();
    const challenge = await this.challengeProvider.start({
      type,
      startAt: now.toISOString(),
      endAt: now
        .add(this.challengeDuration.hours, 'hours')
        .add(this.challengeDuration.minutes, 'minutes')
        .toISOString(),
      boardIds
    });

    const boards = [...boardsMap.values()].flat().filter((board) => boardIds.includes(board.id));
    await this.challengeBots.populate(challenge, boards);

    return challenge;
  }

  // The challenge's boards the participation has no play for yet.
  private async getRemainingBoardIds(
    challenge: challenges.Challenge,
    participation?: challenges.ChallengeParticipation,
  ): Promise<string[]> {
    if (!participation) return challenge.boardIds;

    const plays = await this.playProvider.getForChallengeParticipation(participation.id);
    const playedBoardIds = new Set(plays.map((p) => p.board.id));
    return challenge.boardIds.filter((boardId) => !playedBoardIds.has(boardId));
  }

  private async getBoardsBySize(): Promise<Map<number, Board[]>> {
    const boards = await this.boardProvider.getAll();
    // TODO filter boards by published state
    return boards.reduce((map, board) => {
      const size = board.size;
      if (!map.has(size)) {
        map.set(size, []);
      }
      map.get(size)?.push(board);
      return map;
    }, new Map<number, Board[]>());
  }

  // Each challenge picks from all the boards, on its own — boards can only
  // not repeat within one challenge.
  private pickChallengeBoardIds(boardsMap: Map<number, Board[]>): string[] {
    const boardIds: string[] = [];
    const availableBoards = new Map(
      [...boardsMap].map(([size, boards]) => [size, [...boards]]),
    );
    for (let i = 0; i<5; i++) {
      for (const size of availableBoards.keys()) {
        const boards = availableBoards.get(size)!;
        // Every board is picked once: this size may have run out.
        if (boards.length === 0) continue;

        // Taking the board out keeps it from being picked again.
        const [board] = boards.splice(Math.floor(Math.random() * boards.length), 1);
        boardIds.push(board.id)
      }
    }
    return boardIds;
  }
}
