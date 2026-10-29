import * as uuid from 'uuid';
import * as z from 'zod/v4';

import { player, play as playProviders } from '@dead-lines-inc/backend.providers';
import {
  Board,
  challenges,
  IdentifyPlayer,
  play,
  PlayerAuthProviderEnum,
  PlayTypeEnum,
} from '@dead-lines-inc/common.models';

import { AvatarPool } from '../avatars/avatar-pool';

// TESTING AID, not a game feature. Fills every newly started challenge with
// bot players and their play results, so challenges and leaderboards look
// like real multiplayer while there's only one real player around. Bots are
// ordinary players/participations/plays in storage (ids start with "bot-").
export const challengeBotsOptionsSchema = z.object({
  enabled: z.boolean(),
  // How many bots join each new challenge. Capped to leave room for at least
  // one real player within maxChallengeParticipators.
  participators: z.object({
    min: z.number().int().min(0),
    max: z.number().int().min(0),
  }),
  // Time a bot spends on a board.
  playTimeSeconds: z.object({
    min: z.number().min(1),
    max: z.number().min(1),
  }),
});
export type ChallengeBotsOptions = z.infer<typeof challengeBotsOptionsSchema>;

const BOT_NAMES = [
  'Grim Intern', 'Soul Auditor', 'Night Clerk', 'Pale Rider', 'Ferryman',
  'Banshee', 'Wraith', 'Undertaker', 'Lich Accountant', 'Revenant',
  'Mortimer', 'Morticia', 'Styx Courier', 'Ossuary Temp', 'Ghoul',
  'Specter', 'Reaper Jr.', 'Scythe Sharpener', 'Crypt Keeper', 'Poltergeist',
];

// Mirrors the mobile game's scoring (useBoardGame): each found target gives
// TARGET_SCORE plus FREE_CELL_SCORE per cell still untouched at that moment.
const TARGET_SCORE = 50;
const FREE_CELL_SCORE = 1;
const MAX_STARS = 3;
const WIN_CHANCE = 0.85;

const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

export class ChallengeBots {
  constructor(
    private readonly options: ChallengeBotsOptions | undefined,
    private readonly maxChallengeParticipators: number,
    private readonly playerProvider: player.IPlayerProvider,
    private readonly participationProvider: playProviders.MongoChallengeParticipationProvider,
    private readonly playProvider: playProviders.MongoPlayProvider,
    private readonly avatarPool: AvatarPool,
  ) {}

  async populate(challenge: challenges.Challenge, boards: Board[]): Promise<void> {
    if (!this.options?.enabled) return;

    const { participators } = this.options;
    const count = Math.min(
      randomInt(participators.min, Math.max(participators.min, participators.max)),
      this.maxChallengeParticipators - 1,
      BOT_NAMES.length,
    );

    const botIndexes = [...BOT_NAMES.keys()].sort(() => Math.random() - 0.5).slice(0, count);
    for (const index of botIndexes) {
      const bot = await this.getBot(index);
      const participation = await this.participationProvider.participate(bot.id, challenge);

      // Bots are caught mid-challenge: anywhere from one board to all of them.
      const botBoards = [...boards].sort(() => Math.random() - 0.5).slice(0, randomInt(1, boards.length));
      const plays = botBoards.map((board) => this.makePlay(bot, challenge, participation, board));
      for (const botPlay of plays) {
        await this.playProvider.add(botPlay);
      }
      await this.participationProvider.updateResults(participation, challenge, plays);
    }
  }

  private async getBot(index: number): Promise<IdentifyPlayer> {
    const id = `bot-${String(index + 1).padStart(2, '0')}`;
    return (await this.playerProvider.get(id)) ?? await this.playerProvider.update({
      id,
      name: BOT_NAMES[index],
      avatarId: this.avatarPool.pickRandomStarterAvatarId(),
      isOnboarded: false,
      identity: {
        authProvider: PlayerAuthProviderEnum.bot,
        externalId: id,
        createdAt: new Date().toISOString(),
      },
    });
  }

  private makePlay(
    bot: IdentifyPlayer,
    challenge: challenges.Challenge,
    participation: challenges.ChallengeParticipation,
    board: Board,
  ): play.Play {
    const { playTimeSeconds } = this.options!;
    const isWon = Math.random() < WIN_CHANCE;
    const targetsFound = isWon ? board.size : randomInt(0, board.size - 1);

    // Untouched cells shrink as the bot marks its way through the board.
    const cellsTotal = board.size * board.size;
    let score = 0;
    for (let target = 1; target <= targetsFound; target++) {
      const freeCells = Math.round(cellsTotal * (1 - target / board.size) * Math.random() * 0.6);
      score += TARGET_SCORE + freeCells * FREE_CELL_SCORE;
    }

    // A won play's score is multiplied by the stars left, as in the app.
    // Accuracy plays have neither stars nor score.
    const isAccuracy = challenge.type === PlayTypeEnum.accuracy;
    const stars = isWon && !isAccuracy ? randomInt(1, MAX_STARS) : 0;
    if (isAccuracy) score = 0;

    return {
      id: uuid.v4(),
      isWon,
      playedAt: new Date().toISOString(),
      type: challenge.type,
      player: { id: bot.id },
      challengeParticipation: { id: participation.id, challenge: { id: challenge.id } },
      board: { id: board.id, size: board.size },
      marksUsed: randomInt(board.size, cellsTotal - board.size),
      stars,
      score: isWon ? score * stars : score,
      timeMs: Math.round(
        (playTimeSeconds.min + Math.random() * (playTimeSeconds.max - playTimeSeconds.min)) * 1000,
      ),
    };
  }
}
