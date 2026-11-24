# Domain models & provider contracts

Источник истины: `libs/common/models/src/*`. Все типы — `z.infer` от Zod-схем (`zod/v4`).
Меняешь поле → проверь оба API, mobile, админку и JSON-конфиги в `.mount/cfg`.

## Ядро доски

`Cell.ts`
```ts
cellSchema      = { key: int, kind: number, hasTarget?: boolean }
playCellSchema  = cellSchema + { isMarked?: boolean, isStated?: boolean }   // isStated — «открыт» сервером
```
`BaseBoard.ts`
```ts
MIN_BOARD_SIZE = 5, MAX_BOARD_SIZE = 12

baseBoardSchema = { size: int 5..12, cells: Cell[] }
  .refine(cells.length === size*size)
  .refine(каждый cell.kind <= size)                 // kind = номер «региона» (цвета/зоны)

boardSchema      = baseBoard + { id, createdAt: ISO, state: BoardStateEnum,
                                 complexity: BoardComplexityEnum, stats: boardStatsSchema }
playBoardSchema  = baseBoard (cells: PlayCell[]) + { id }
```
`validateBoard(board)` — правило корректной доски, используется генератором в админке:
целей ровно `size`; ни две цели в одной строке/столбце/регионе; цели не соседние (в т.ч. по диагонали).

## Игрок

`Player.ts`
```ts
PlayerAuthProviderEnum = anonymous | google | bot
PLAYER_NAME_MAX_LENGTH = 20; playerNameSchema = string.trim().min(1).max(20)

playerSchema        = { id, name, avatarId }                       // публичные данные
playerIdentitySchema = { provider: PlayerAuthProviderEnum, externalId }  // externalId для anonymous — SHA-256(deviceId)
identifyPlayerSchema = playerSchema + { identity, isOnboarded: boolean = false }
playerIdentitySchema += { appVersion: "x.y.z" | null = null, lastEnterAt: ISO | null = null }  // статистика
```
`Avatar.ts`: `avatarSchema = { id, rarity: common|rare|epic|legendary }`; id = имя файла картинки.
`PlayerAvatars.ts`: `{ playerId, avatarIds: string[] }` — доступные игроку аватары.

## Игра

`play/PlayTypeEnum.ts`: `score | time | accuracy | freePlay`
`play/Play.ts`
```ts
playSchema = { id, isWon, playedAt: ISO, type: PlayTypeEnum, player: { id },
               challengeParticipation?: { id, challenge: { id } },
               board: { id, size }, marksUsed, stars, score, timeMs }
```
`play/PlayHistory.ts` — журнал действий для реплея/античита:
```ts
PlayActionTypeEnum = setMark | unsetMark | state
playActionRecordSchema = { timeMs, type, cellKey }[]        // записи одного хода
playHistorySchema = { play: { id }, history?: PlayActionRecord[][] }
```

## Челленджи

`challenges/Challenge.ts`
```ts
ChallengeStatusEnum = active | finished
challengePlayTypeSchema = PlayTypeEnum без freePlay          // score | time | accuracy
challengeSchema = { id, status, startAt, endAt, type, boardIds: string[] }
```
`challenges/ChallengeParticipation.ts` — строка лидерборда и состояние прохождения:
```ts
ParticipationStateEnum = new | playing | completed | finished
{ id, challenge: { id }, state, player, score = 0, avgTimeMs?, lastPlayTimestamp?: ISO,
  boardsPlayed = 0, boardsWon = 0 }
```
`challenges/ChallengeLeaderboard.ts`: `{ challenge: { id, type }, leaderboard: ChallengeParticipation[] }`

## Конфигурация, отдаваемая мобилке (`MobileConfiguration.ts`)

```ts
mobileApiConfigurationSchema = { baseUrl?, routes: { identifyPlayer, registerPlayer,
  activeChallenges, joinChallenge, startPlay, acceptPlayResults, leaderboard,
  setPlayerAvatar, setPlayerName, completeOnboarding } }          // пути относительно baseUrl

avatarAssetSchema = avatarSchema + { url }     // абсолютный URL или путь от baseUrl
languageSchema    = { code: 'en'|'pt-br'…, name: 'Deutsch' }     // code — ключ фраз

mobileConfigurationSchema = { api, ads: { penaltyAdUnitId: { android, ios } },
  language,              // выбранный сервером язык (лучшее совпадение с запросом)
  languages: Language[], // всё, на что можно переключиться
  texts: MobileTexts,    // уже только на `language` (фолбэк на en)
  avatars: AvatarAsset[] }
```
Серверная сторона (`mobileConfigurationSourceSchema`) отличается тем, что `texts` содержит
все языки сразу (см. `MobileTexts.ts`): `phrase = { en: string | string[], [lang]: … }`,
`en` обязателен, массивы — варианты фразы (выбираются случайно, чтобы не повторяться).

## Provider contracts (`libs/backend/providers`)

```
board.IBoardProvider       add / get / update / getAll                     → реализация: MongoBoardProvider, MockBoardProvider
player.IPlayerProvider     findByIdentity(provider, externalId) / create(provider, externalId, avatarId) / get / getMany / update
player.IPlayerAvatarsProvider
play.IChallengeProvider    get / start / finishExpired(now) / getLatest(type) / getMany(ids)
play.IChallengeParticipationProvider
play.IPlayProvider         add / get / getForChallengeParticipation(participationId)
play.IPlayHistoryProvider
```
Инфраструктура: `MongoConnection` (официальный драйвер), `MongoProvider` (базовый класс
коллекции), `MongoTransaction`. Опции каждого провайдера описаны Zod-схемами в
`libs/backend/providers/src/**` и вставляются в конфиг приложения через
`providers.*ProviderOptionsSchema`.

## Скоринг (константы в `apps/mobile.api/src/app/plays/plays.service.ts`)

- цель найдена: `+50` (`SCORE_PLAY_TARGET_FOUND`);
- «свободная» клетка: `+1` (`SCORE_PLAY_FREE_CELLS`);
- мобилка считает то же самое в `useBoardGame` (`TARGET_SCORE`, `FREE_CELL_SCORE`) — при
  изменении правь оба места, значения приходят в `startPlay` как `scoresGained`;
- звёзды: до 3 (`MAX_STARS`), множитель считается в `useStarMultiplier`.
