import * as uuid from 'uuid';
import * as z from 'zod/v4';

import { challenges, play, Player, playerSchema } from "@dead-lines-inc/common.models";

import { MongoConnection } from "../MongoConnection";
import { IMongoProviderOptions, MongoProvider } from "../MongoProvider";
import { MongoTransaction } from "../MongoTransaction";
import { IPlayerProvider } from "../player/IPlayerProvider";
import { IChallengeParticipationProvider } from "./IChallengeParticipationProvider";

// Players live in their own storage, so the participation references its
// player by id only and gets the public player data filled in on read.
const storedParticipationSchema = challenges.challengeParticipationSchema
  .extend({ player: playerSchema.pick({ id: true }) });
type StoredParticipation = z.infer<typeof storedParticipationSchema>;

export class MongoChallengeParticipationProvider extends MongoProvider<StoredParticipation> implements IChallengeParticipationProvider {
  protected schema = storedParticipationSchema;

  constructor(
    connection: MongoConnection,
    options: IMongoProviderOptions,
    private readonly playerProvider: IPlayerProvider,
  ) {
    super(connection, options);
  }

  protected override getModelId(model: StoredParticipation): string {
    return model.id;
  }

  async get(id: string): Promise<challenges.ChallengeParticipation> {
    const participation = await this.getModel(id);
    return { ...participation, player: await this.getPlayer(participation.player.id) };
  }

  async getForChallenges(playerId: string, challenges: challenges.Challenge[]): Promise<challenges.ChallengeParticipation[]> {
    const participations = await this.findModels({
      $and: [
        {
          'player.id': playerId
        },
        {
          'challenge.id': {
              $in: challenges.map(c => c.id)
          }
        }
      ]
    });
    const player = await this.getPlayer(playerId);
    return participations.map((participation) => ({ ...participation, player }));
  }

  // Every participation of the player not finished (confirmed) yet.
  async getUnfinished(playerId: string): Promise<challenges.ChallengeParticipation[]> {
    const participations = await this.findModels({
      'player.id': playerId,
      state: { $ne: challenges.ParticipationStateEnum.finished },
    });
    const player = await this.getPlayer(playerId);
    return participations.map((participation) => ({ ...participation, player }));
  }

  async getJoinedChallengeIds(playerId: string): Promise<string[]> {
    return await this.collection.distinct('challenge.id', { 'player.id': playerId });
  }

  async countForChallenge(challenge: challenges.Challenge): Promise<number> {
    return await this.collection.countDocuments({ 'challenge.id': challenge.id });
  }

  async getAllForChallenge(challenge: challenges.Challenge): Promise<challenges.ChallengeParticipation[]> {
    const participations = await this.findModels({ 'challenge.id': challenge.id });
    const players = new Map(
      (await this.playerProvider.getMany(participations.map((p) => p.player.id)))
        .map((player) => [player.id, playerSchema.parse(player)]),
    );
    return participations.flatMap((participation) => {
      const player = players.get(participation.player.id);
      // A participant whose player record is gone has nobody to show.
      return player ? [{ ...participation, player }] : [];
    });
  }

  // Joins the player to the challenge as new — or returns their participation
  // there if they've joined already, so concurrent requests (e.g. two quick
  // home screen reloads) don't join them twice.
  async participate(playerId: string, challenge: challenges.Challenge, transaction?: MongoTransaction): Promise<challenges.ChallengeParticipation> {
    const player = await this.getPlayer(playerId);
    // player and challenge are filled in from the filter on insert.
    const participation = await this.collection.findOneAndUpdate(
      { 'player.id': player.id, 'challenge.id': challenge.id },
      {
        $setOnInsert: {
          id: uuid.v4(),
          state: challenges.ParticipationStateEnum.new,
          score: 0,
          boardsPlayed: 0,
          boardsWon: 0,
        },
      },
      { upsert: true, returnDocument: 'after', session: transaction?.getSession() },
    );
    return { ...this.parse(participation), player };
  }

  // Score and average time count won plays only — avgTimeMs stays unset
  // until the first win. A finished participation stays finished.
  async updateResults(
    participation: challenges.ChallengeParticipation,
    challenge: challenges.Challenge,
    plays: play.Play[],
    transaction?: MongoTransaction,
  ): Promise<challenges.ChallengeParticipation> {
    const wonPlays = plays.filter((p) => p.isWon);
    const { player, ...rest } = participation;
    const saved = await this.save({
      ...rest,
      player: { id: player.id },
      state: participation.state === challenges.ParticipationStateEnum.finished
        ? challenges.ParticipationStateEnum.finished
        : plays.length >= challenge.boardIds.length
          ? challenges.ParticipationStateEnum.completed
          : challenges.ParticipationStateEnum.playing,
      score: wonPlays.reduce((acc, p) => acc + p.score, 0),
      avgTimeMs: wonPlays.length
        ? Math.ceil(wonPlays.reduce((acc, p) => acc + p.timeMs, 0) / wonPlays.length)
        : undefined,
      // Never moves back: touchUnfinished may have set a later one already.
      lastPlayTimestamp: plays.reduce<string | undefined>(
        (latest, p) => (!latest || p.playedAt > latest ? p.playedAt : latest),
        participation.lastPlayTimestamp,
      ),
      boardsPlayed: plays.length,
      boardsWon: wonPlays.length,
    }, transaction);
    return { ...saved, player };
  }

  // Marks the player as active at `timestamp` in every challenge they haven't
  // finished with — whatever they're playing. Keeps the later time if one is
  // already set.
  async touchUnfinished(playerId: string, timestamp: string): Promise<void> {
    await this.collection.updateMany(
      { 'player.id': playerId, state: { $ne: challenges.ParticipationStateEnum.finished } },
      { $max: { lastPlayTimestamp: timestamp } },
    );
  }

  async finish(participation: challenges.ChallengeParticipation, transaction?: MongoTransaction): Promise<challenges.ChallengeParticipation> {
    const { player, ...rest } = participation;
    const saved = await this.save({
      ...rest,
      player: { id: player.id },
      state: challenges.ParticipationStateEnum.finished,
    }, transaction);
    return { ...saved, player };
  }

  // Public player data only — the stored player carries identity too.
  protected async findPlayer(id: string): Promise<Player | null> {
    const player = await this.playerProvider.get(id);
    return player ? playerSchema.parse(player) : null;
  }

  protected async getPlayer(id: string): Promise<Player> {
    const player = await this.findPlayer(id);
    if (!player) {
      throw new Error(`Player ${id} not found`);
    }
    return player;
  }
}
