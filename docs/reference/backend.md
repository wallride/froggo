# Backends

Два независимых NestJS-приложения. Оба собираются webpack в один `main.js` (внешние
зависимости остаются в `package.json`). Конфиг разделён: контент (тексты, лимиты, пул
аватаров) — файл в релизе, операционное (секреты, адреса, переключатели) — только env.

## apps/mobile.api (порт по умолчанию 3001)

### Bootstrap (`src/main.ts`)

1. `resolveConfigPath()` — `--config=<path>`, `CONFIG_PATH`, иначе `configuration.json`
   рядом с `main.js` (его кладёт в архив packer): контейнер стартует без единого монтирования.
2. `buildConfiguration(file, process.env)` — валидация контентного файла + операционных
   значений из env (см. ниже).
3. `app.use(accessLog)` — до всех маршрутов: каждый запрос (включая 404 и запросы,
   которые так и не получили ответ — `aborted`) пишется строкой `[HTTP]`, с `ip`,
   `x-forwarded-for`, `x-forwarded-proto`, `Host` и `User-Agent`.
4. `app.setGlobalPrefix('api')`, `enableCors({ origin: configuration.cors?.allowedOrigins ?? true })`.
5. `useStaticAssets(assets.rootPath, { prefix: '/assets/', maxAge: '365d', immutable: true })`.
6. Корневые `/` и `/health` отвечают той же живостью, что `/api/health`: платформа проверяет
   liveness на `/` по умолчанию, и `404` там неотличим от мёртвого процесса.
7. `app.listen(PORT, '0.0.0.0')` (`PORT` по умолчанию 3001; в образе 3000).
8. Стартовые логи (без секретов): конфигурация (`mongo` без креденшелов, версия, ассеты, CORS),
   фактический адрес прослушивания и сеть контейнера (hostname + IPv4); ошибка старта
   печатается и завершает процесс с кодом 1.

### Конфигурация (`src/Configuration.ts`)

```jsonc
{
  "dependencies": {                      // опции провайдеров (Zod-схемы из libs/backend/providers)
    "playerProvider":                   { "collectionName": "players" },
    "playerAvatarsProvider":            { "collectionName": "playerAvatars" },
    "boardProvider":                    { "collectionName": "boards" },
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
  "mobileConfiguration": { "api": {...}, "ads": {...}, "languages": [...], "texts": {...} }
}
```

Это **контентная часть** (`contentConfigurationSchema`): одинаковая во всех окружениях, лежит
в релизе как `configuration.json` рядом с `main.js`. Секреты и всё, что зависит от
окружения, в файле запрещены (`z.strictObject`) — такой ключ роняет старт, а не игнорируется:

| Env | Что задаёт |
|---|---|
| `MONGO_URI` | подключение к MongoDB с логином и паролем |
| `AUTH_TOKEN_SECRET` | ключ подписи токенов, ≥32 символа |
| `MINIMUM_APP_VERSION` | минимальная версия приложения (`x.y.z`); старее — 426 |
| `CORS_ALLOWED_ORIGINS` | origin'ы для веб-таргета через запятую; пусто — любой |
| `ASSETS_ROOT_PATH` | где лежат ассеты; по умолчанию `assets` рядом с `main.js` |
| `ASSETS_PUBLIC_BASE_URL` | отдавать ассеты не из API, а из CDN/прокси |
| `PORT` | порт, по умолчанию 3001 |

`buildConfiguration()` возвращает ту же форму, что и раньше (`Configuration`): контент +
`minimumAppVersion`, `assets`, `cors` из env, — поэтому остальной код о разделении не знает.

### Модули

`AppModule.forRoot(configuration)` → `ConfigurationModule` (провайдер `CONFIGURATION`),
`AuthModule` (JWT HS256 + `PlayerAuthGuard`), `DatabaseModule` (`MongoConnection` +
`board.MongoBoardProvider`), `PlayersModule`, `PlaysModule`.

### Эндпоинты (все под `/api`)

| Метод | Путь | Auth | Request → Response |
|---|---|---|---|
| GET | `/health` | — | → `{ status: 'ok', uptime, startedAt }` (для хостинга; вне `AppVersionGuard`, БД не трогает). Та же живость отдаётся на корневых `/` и `/health` — вне префикса `api` |
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

### Версия приложения

Клиент присылает версию релиза в заголовке `X-App-Version: x.y.z` **на каждый** запрос
(значение — `version` из `app.json`, см. mobile-app.md). `AppVersionGuard` — глобальный
`APP_GUARD` в `AppModule`, поэтому проверяет все `/api/*`, включая `GET /api/configuration`:

- версия ≥ `minimumAppVersion` → запрос проходит;
- версия старее, формат не `x.y.z` или заголовка нет → `426 Upgrade Required`
  с телом `{ code: 'APP_VERSION_UNSUPPORTED', minimumVersion }`
  (`appVersionErrorSchema` из `libs/common/api/mobile`);
- отказы логируются один раз на версию, чтобы старая сборка не спамила лог;
- маршруты с `@SkipAppVersionCheck()` (`app-version/skip-app-version-check.decorator.ts`)
  guard пропускает — это запросы не от приложения, прежде всего `GET /api/health`
  (healthcheck хостинга приходит без заголовка версии).

`minimumAppVersion` приходит из env `MINIMUM_APP_VERSION`, а не из конфига: это решение
деплоя, его меняют без пересборки. Клиент узнаёт о необходимости обновления только из 426. Сравнение —
`app-version.ts`, без semver-зависимостей.

Кроме проверки, версия из заголовка **сохраняется в модель игрока** — в `identity` (см.
domain-models.md), вместе с `lastEnterAt`, при `identify` и `register`: сервер копит их для будущей
статистики по версиям и по входам. Текущую версию запроса отдаёт декоратор `@AppVersion()`
(`app-version.decorator.ts`, читает тот же заголовок). `lastEnterAt` пишется при каждой
идентификации (это и есть «вошёл в игру»), `appVersion` — заодно с ней. У старых записей и у ботов,
которых сервер создаёт сам, оба поля `null`.

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
  поэтому кэш можно держать `immutable`. Файлы аватаров запекаются в релиз (`.mount/assets` →
  `assets/` в архиве), так что добавлять/менять аватар — это новый релиз, а не перезапуск.
- `assets/assets.options.ts` — `ASSETS_ROUTE = '/assets'`.
- `avatars/avatar-pool.ts` — выбирает стартовый аватар и валидирует, что id есть в пуле.
- `configuration/localize-texts.ts` — `resolveLanguage(request, languages)` + `localizeTexts(lang, texts)`:
  клиенту отдаётся один язык, отсутствующие фразы — английские.

## apps/admin.api (порт по умолчанию 3000)

Минимальный CRUD досок без авторизации — рассчитан на приватную сеть.

- `src/main.ts`: тот же `CONFIG_PATH`/`--config=` (по умолчанию `configuration.json` рядом
  с `main.js`), глобальный префикс `api`, `PORT` (3000), `enableShutdownHooks()`
  (при остановке закрывается соединение с Mongo).
- `GET /api/health` — `{ status: 'ok' }`, БД не трогает.
- `src/Configuration.ts`: `dependencies.boardProvider` (`collectionName`) + `dependencies.mongo`
  (`database`); `uri` — только из env `MONGO_URI`, в файле он запрещён (`z.strictObject`).
  База и коллекция `boards` те же, что у mobile.api.
- `app/database/database.module.ts` — `@Global` модуль с `MongoConnection` и
  `board.MongoBoardProvider` (создаёт уникальный индекс `{ id: 1 }` при старте).
- Эндпоинты: `GET /api/boards`, `GET /api/boards/:id`, `POST /api/boards` (`baseBoardSchema`),
  `PUT /api/boards` (`boardSchema`). Валидация через `ZodValidationPipe`.
- Реализация — `BoardsService` поверх `board.MongoBoardProvider`.

## Цели Nx (одинаковы для обоих API)

```
build              webpack-cli build (NODE_ENV=production) → dist/apps/<app>/main.js
prune-lockfile     @nx/js:prune-lockfile → dist/apps/<app>/{package.json,pnpm-lock.yaml}
copy-workspace-modules  workspace-модули рядом с main.js (если появятся)
prune              noop-агрегатор (для деплой-пайплайна)
serve              @nx/js:node
test               jest (сейчас падает на парсинге конфига, см. ai-context)
release            semantic-release (cwd = apps/<app>, конфиг — apps/<app>/.releaserc.json)
```

Архив релиза собирает `tools/release/pack-backend.mjs` (см. [release-deploy.md](release-deploy.md)).
