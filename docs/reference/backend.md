# Backends

Два независимых NestJS-приложения. Оба собираются webpack в один `main.js` (внешние
зависимости остаются в `package.json`), конфиг читают из файла, путь к которому приходит
явно (`--config=<path>` или `CONFIG_PATH`).

## apps/mobile.api (порт по умолчанию 3001)

### Bootstrap (`src/main.ts`)

1. `resolveConfigPath()` — `--config=<path>` или `CONFIG_PATH`, иначе падение с внятной ошибкой.
2. `buildConfiguration(file, process.env)` — валидация файла + секретов из env.
3. `app.setGlobalPrefix('api')`, `enableCors({ origin: configuration.cors?.allowedOrigins ?? true })`.
4. `useStaticAssets(assets.rootPath, { prefix: '/assets/', maxAge: '365d', immutable: true })`.
5. `PORT` (по умолчанию 3001).

### Конфигурация (`src/Configuration.ts`)

```jsonc
{
  "dependencies": {                      // опции провайдеров (Zod-схемы из libs/backend/providers)
    "playerProvider":                   { "collectionName": "players" },
    "playerAvatarsProvider":            { "collectionName": "playerAvatars" },
    "boardProvider":                    { "storage": { "rootPath": "...", "filePatternRegExp": ".+\\.json" }, "space": 2 },
    "mongo":                            { "uri": "<из MONGO_URI>", "database": "deadLinesInc" },
    "challengeProvider":                { "collectionName": "challenges" },
    "challengeParticipationProvider":   { "collectionName": "challengeParticipations" },
    "playHistoryProvider":              { "collectionName": "playHistories" },
    "playProvider":                     { "collectionName": "plays" }
  },
  "auth": { "accessTokenTtlMinutes": 1440 },      // tokenSecret — только из env
  "maxChallengeParticipators": 10,                // набралось — новый челлендж
  "challengeDuration": { "hours": 24, "minutes": 0 },
  "challengeBots": { "enabled": true, "participators": { "min": 4, "max": 8 }, ... },  // тест-помощник
  "avatarPool": { "common": 8, "rare": 8, "epic": 8, "legendary": 6 },
  "assets": { "rootPath": "...", "publicBaseUrl": "..." },      // файлы аватаров: <rootPath>/avatars/<id>
  "mobileConfiguration": { "api": {...}, "ads": {...}, "languages": [...], "texts": {...} },
  "cors": { "allowedOrigins": ["https://..."] }
}
```

**Секреты только из env:** `MONGO_URI`, `AUTH_TOKEN_SECRET` (≥32 символа). Файл валидируется
`configurationFileSchema` (`z.strictObject` на `dependencies.mongo` и `auth`) — лишний ключ
`uri`/`tokenSecret` в файле считается ошибкой, а не игнорируется. Это осознанная защита:
конфиг лежит в контейнере как есть и может попасть в репозиторий.

### Модули

`AppModule.forRoot(configuration)` → `ConfigurationModule` (провайдер `CONFIGURATION`),
`AuthModule` (JWT HS256 + `PlayerAuthGuard`), `DatabaseModule` (`MongoConnection`),
`PlayersModule`, `PlaysModule`.

### Эндпоинты (все под `/api`)

| Метод | Путь | Auth | Request → Response |
|---|---|---|---|
| GET | `/configuration?language=ru-RU,en` | — | `GetConfigurationRequest` → `MobileConfiguration` (тексты на одном языке; язык выбирается по первому совпавшему, фолбэк — `en`) |
| POST | `/players/identify` | — | `{authProvider, externalId}` → `{ session: PlayerSession \| null }` |
| POST | `/players/register` | — | `{authProvider, externalId}` → `PlayerSession` (идемпотентно: существующий игрок возвращается как есть) |
| POST | `/players/set-avatar` | Bearer | `{avatarId}` → `{avatarId, avatars}` |
| POST | `/players/set-name` | Bearer | `{name}` → `IdentifyPlayer` |
| POST | `/players/complete-onboarding` | Bearer | — → `IdentifyPlayer` |
| GET | `/plays/active-challenges` | Bearer | → `ActiveChallenge[]` (`challenge` + `participation`) |
| POST | `/plays/join-challenge` | Bearer | `{type}` → `challenge` + `participation` |
| POST | `/plays/start` | Bearer | `{type, challengeId?}` → `{board, scoresGained:{perTarget, perEachFreeCell}, challengeParticipation?}` |
| POST | `/plays/accept-results` | Bearer | `{plays:[{play, history}]}` → пустое тело (может быть несколько записей: клиент отправляет накопленную очередь) |
| GET | `/plays/leaderboard?challengeId=` | Bearer | → `{leaderboard, remainingBoardIds}` |

Валидация — `ZodValidationPipe` на конкретном обработчике (`@Body(new ZodValidationPipe(schema))`),
не на всём контроллере. Схемы запросов лежат в `libs/common/api/mobile` — это же контракт для клиента.

`GET /api/configuration` — фиксированный путь (`CONFIGURATION_ROUTE`), потому что он нужен
клиенту для бутстрапа; остальные пути клиент берёт из ответа (`api.routes`).

### Аутентификация

- `PlayerTokens` (`auth/player-tokens.ts`): `issue(playerId)` / `verify(token) → playerId | null` (JWT HS256, payload `{sub}`, TTL из конфига).
- `PlayerAuthGuard`: требует `Authorization: Bearer <jwt>`, кладёт `request.playerId`; иначе 401.
- `@AuthenticatedPlayerId()` — декоратор для получения `playerId` в обработчике.
- Идентичность anonymous: `externalId` (deviceId) хешируется SHA-256 перед сохранением
  (`players/stored-identity.ts`, `toStoredExternalId`). Провайдеры кроме `anonymous` пока не принимаются.

### Логика игр (`plays/plays.service.ts`)

- `startPlay` → `pickPlay`: freePlay — случайная доска; челлендж — доска из `challenge.boardIds`,
  которую игрок ещё не играл. Ответ всегда содержит `scoresGained`, для челленджа — участие
  (создаётся по требованию, если игрок ещё не в челлендже). Любой старт продлевает активность
  во всех текущих челленджах (`touchUnfinished`).
- `acceptPlayResults`: проверяет, что каждый play принадлежит аутентифицированному игроку
  (`assertOwnPlay`), сохраняет play + историю, обновляет участие (`score`, `boardsPlayed/Won`,
  `avgTimeMs`, `lastPlayTimestamp`), помечает прохождение завершённым.
- `getLeaderboard`: сортировка зависит от типа — `time` по `avgTimeMs` ↑, `accuracy` по
  `boardsWon` ↓, `score` по `score` ↓; возвращает `remainingBoardIds`.
- `getActiveChallenges` — по одному активному челленджу каждого типа; `joinChallenge` —
  закрывает участие в завершившемся и вступает в новый (`findOrStartChallenge`, при нехватке
  досок — `pickChallengeBoardIds`, 5 раундов × размеры, без повторов).
- `challenge-bots.ts` — наполняет новые челленджи ботами (только для тестов, отключается конфигом).
- `board-transformer.ts` — случайный поворот/отражение доски (8 симметрий квадрата, D4), чтобы одна и
  та же доска не выглядела одинаково в разных играх. `hasTarget` уходит клиенту сразу, но клетка
  показывается как цель только после `isStated` (`BoardCell.tsx`).
- TODO в коде: фильтрация досок по published-состоянию (`getBoardsBySize`).

### Ассеты и локализация

- `assets/asset-catalog.ts` — строит URL ассета (`publicBaseUrl ?? /assets` + `?v=<hash>`/mtime),
  поэтому кэш можно держать `immutable`.
- `assets/assets.options.ts` — `ASSETS_ROUTE = '/assets'`.
- `avatars/avatar-pool.ts` — выбирает стартовый аватар и валидирует, что id есть в пуле.
- `configuration/localize-texts.ts` — `resolveLanguage(request, languages)` + `localizeTexts(lang, texts)`:
  клиенту отдаётся один язык, отсутствующие фразы — английские.

## apps/admin.api (порт по умолчанию 3000)

Минимальный CRUD досок без авторизации — рассчитан на приватную сеть.

- `src/main.ts`: тот же `CONFIG_PATH`/`--config=`, глобальный префикс `api`, `PORT` (3000).
- `src/Configuration.ts`: только `dependencies.boardProvider` (JSON-файлы). Секретов нет.
- Эндпоинты: `GET /api/boards`, `GET /api/boards/:id`, `POST /api/boards` (`baseBoardSchema`),
  `PUT /api/boards` (`boardSchema`). Валидация через `ZodValidationPipe`.
- Реализация — `BoardsService` поверх `JSONFileBoardProvider`.

## Цели Nx (одинаковы для обоих API)

```
build              webpack-cli build (NODE_ENV=production) → dist/apps/<app>/main.js
prune-lockfile     @nx/js:prune-lockfile → dist/apps/<app>/{package.json,pnpm-lock.yaml}
copy-workspace-modules  workspace-модули рядом с main.js (если появятся)
prune              noop-агрегатор (для деплой-пайплайна)
serve              @nx/js:node
test               jest (сейчас падает на парсинге конфига, см. ai-context)
release            semantic-release --extends ./apps/<app>/release.config.mjs
```

Архив релиза собирает `tools/release/pack-backend.mjs` (см. [release-deploy.md](release-deploy.md)).
