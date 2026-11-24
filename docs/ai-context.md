# AI Context

Точка входа для агента. Читай этот файл первым; детали — в `docs/reference/*`.
Цель: работать по проекту без полного обхода кодовой базы.

**Reading order:** этот файл → нужный reference-файл → конкретные файлы кода.

| Нужно | Файл |
|---|---|
| Модели домена, статусы, константы, контракты провайдеров | [reference/domain-models.md](reference/domain-models.md) |
| Серверная логика, эндпоинты, конфиг, auth | [reference/backend.md](reference/backend.md) |
| Мобильное приложение: старт, экраны, игра, API-клиенты | [reference/mobile-app.md](reference/mobile-app.md) |
| Веб-админка (редактор досок) | [reference/admin-panel.md](reference/admin-panel.md) |
| Релизы, Docker, секреты, деплой | [release.md](release.md), [reference/release-deploy.md](reference/release-deploy.md), [deployment.md](deployment.md) |
| Игровые правила и продуктовый замысел | [game-mechanics.md](game-mechanics.md), [design-concept.md](design-concept.md) |
| Принципы архитектуры / ADR | [architecture.md](architecture.md), [adr/](adr/) |
| Известные проблемы | ниже, раздел «Known issues» |

## Stack

- Nx 23 (integrated monorepo), pnpm, TypeScript 5.9 strict, Node 24.11.1 (см. `.nvmrc`, `engines`).
- Mobile: Expo 57 / React Native 0.86 / react-native-web, react-navigation 7 (native-stack), reanimated 4, expo-image/font/localization/secure-store/file-system/crypto.
- Backends: NestJS 11 (Express), `@nestjs/jwt`, Zod 4 (`zod/v4`) + `ZodValidationPipe`.
- БД: MongoDB 7 (официальный драйвер, без ORM/Mongoose): игроки, аватары, доски, челленджи, воспроизведения.
- Releases: semantic-release 25 → GitHub Releases. Admin panel: React + Vite.

## Workspace map

```
apps/mobile          Expo-приложение (iOS/Android/web)
apps/mobile.api      NestJS: клиентский API (игроки, игры, челленджи, конфиг, ассеты)  :3001
apps/admin.api       NestJS: CRUD досок для админки                                        :3000
apps/admin           React+Vite веб-панель: редактор/генератор досок
apps/*-e2e           каркасные e2e-заготовки (не используются)

libs/common/models           Zod-схемы + z.infer типы домена (единственный источник истины)
libs/common/api/mobile       IPlayerAPI / IPlayAPI / IConfigurationAPI + request/response типы
libs/common/api/admin        IBoardAPI
libs/backend/providers       Mongo-провайдеры (доски, игроки, челленджи, воспроизведения), MongoConnection, MongoTransaction
libs/backend/processors      IPlayProcessor (задел, не подключён)
libs/frontend                тема (colors, fonts) и kindColors — общие для mobile и admin
tools/release                плагины semantic-release, упаковка архива, ремонт релиза
ci/docker                    старый Dockerfile/compose из чужого проекта (см. release-deploy.md)
Dockerfile                   образ mobile.api для App Platform/VPS (см. deployment.md)
```

Alias: `@dead-lines-inc/common.models`, `.../backend.providers`, `.../common.api.mobile`,
`.../common.api.admin`, `.../frontend` (см. `tsconfig.base.json`).

## Commands

```bash
npx nx serve mobile          # Expo (Metro);  web: npx nx serve mobile --web
npx nx serve mobile.api      # env — в apps/mobile.api/.env
npx nx serve admin.api
npx nx serve admin           # Vite-админка
npx nx run-many -t build lint test
npx nx run mobile.api:release   # semantic-release, см. release.md
cd apps/mobile && EAS_BUILD_SKIP_LOCKFILE_CHECK=1 eas build --profile preview --platform android  # см. release.md
npx tsc --noEmit -p apps/mobile/tsconfig.app.json   # быстрый typecheck без Nx
```

Тестов почти нет; `test` падает на парсинге `jest.config.ts` (см. Known issues).

## Golden rules

1. **Секретов в файлах нет.** Никаких URI/логинов/паролей в репозитории (он публичный).
   Всё приходит через env (`MONGO_URI`, `AUTH_TOKEN_SECRET`, `MINIMUM_APP_VERSION`, `PORT`) и
   Docker secrets. Контентный конфиг — часть релиза, а не секрет. Схемы конфигов —
   `z.strictObject`: секрет или env-переменная, оставленные в файле, роняют старт (это фича).
2. **Типы моделей только через Zod.** Hand-written интерфейсы домена не пишем:
   `export const xSchema = z.object({...}); export type X = z.infer<typeof xSchema>; enum → z.enum.
3. **Именованные экспорты**, без `default` (кроме конфигов vite).
4. **Бизнес-логика вне UI и вне Nest-контроллеров**: контроллеры тонкие, логика в сервисах;
   правила игры — в `useBoardGame`/сервисах, не в разметке.
5. **Изменение модели = ripple**: правишь `libs/common/models` → проверь оба API, mobile,
   админку и JSON-конфиги в `.mount/cfg`. Комментарии в коде проекта содержательные — им можно верить.
6. **Conventional Commits** — от них зависят версии релизов (scope = имя приложения).
7. **Комментарии и документация — по-английски** (`deployment.md` исторически на русском).

## Как всё связано (happy path)

```
mobile start
  └ GET /api/configuration?language=xx        → texts(lang) + routes + avatars + ads
      └ POST {routes.identifyPlayer} (deviceId) → session | null
          └ POST {routes.registerPlayer} (при первом запуске) → player + avatars + JWT
              └ Authorization: Bearer <jwt> на всех остальных вызовах (AuthSession, 401 → re-identify)
                  ├ GET  {routes.activeChallenges}
                  ├ POST {routes.joinChallenge}
                  ├ POST {routes.startPlay}        → board + scoresGained (+ participation)
                  ├ POST {routes.acceptPlayResults} → play + history (оффлайн → очередь на диске)
                  └ GET  {routes.leaderboard}
```

Клиент не зашивает пути: маршруты приходят в конфигурации, `baseUrl` можно переопределить
(по умолчанию — `EXPO_PUBLIC_API_BASE_URL`, иначе `http://localhost:3001`).

## Конфигурация и секреты (кратко)

| Что | Где живёт | В репозитории |
|---|---|---|
| Контент API (провайдеры, лимиты, тексты, пул аватаров) | `configuration.json` рядом с `main.js`: его кладёт в архив `tools/release/pack-backend.mjs`, `CONFIG_PATH` переопределяет путь | шаблон значений: `.mount/cfg/*.json` (без секретов и без env) |
| `MONGO_URI`, `AUTH_TOKEN_SECRET` | env / Docker secret | только имена в `.env.example` |
| `MINIMUM_APP_VERSION`, `CORS_ALLOWED_ORIGINS`, `ASSETS_ROOT_PATH`, `ASSETS_PUBLIC_BASE_URL`, `PORT` | env | `.env.example` |
| Доски | MongoDB, коллекция `boards` (`boardProvider.collectionName`) | — (импорт старых файлов: `tools/migrate-boards-to-mongo.mjs`) |
| Ассеты (аватары) | `assets` рядом с `main.js` в архиве релиза (`ASSETS_ROOT_PATH`), отдаются как `/assets/*` | картинки в `.mount/assets` |

Локальные `.env` — `apps/mobile.api/.env`, `apps/admin.api/.env` (gitignored).
Корневой `.env` — наследие, к проекту не относится (см. Known issues).

## Releases & deploy (кратко)

- `npx nx run <app>:release` → semantic-release: коммиты, затрагивающие приложение или его
  зависимости в графе Nx → тег `<app>-v<version>` → GitHub Release с `<app>-v<version>.tar.gz`
  (внутри `main.js`, `package.json`, `pnpm-lock.yaml`). Настройки — обычный
  `apps/<app>/.releaserc.json`; цель Nx запускает semantic-release в папке приложения
  (`cwd: {projectRoot}`), общего конфига в `tools/` нет. Пошагово — [release.md](release.md).
- Публикация релиза идемпотентна (`tools/release/publish-backend.mjs` + `gh-release.mjs`,
  через `gh` CLI; `@semantic-release/github` больше не используется). Доступ к GitHub
  проверяется до создания тега. Если тег уже есть, а релиза нет —
  `npx nx run <app>:repair-release` (`tools/release/repair-release.mjs`).
- Токен GitHub — только через env: `GH_TOKEN` с `contents: write` (в файлы не кладётся;
  `GITHUB_TOKEN` тоже работает, но `GH_TOKEN` главнее).
- Контейнер: скачать архив релиза → `pnpm install --prod --frozen-lockfile` → `node main.js`.
  Ничего не монтируется: контентный конфиг и аватары уже в архиве, остальное — env.
  Живость проверяется через `GET /api/health` (вне `AppVersionGuard`, без БД).
- Подробности и открытые расхождения — [reference/release-deploy.md](reference/release-deploy.md).

## Known issues / gotchas

- `nx lint mobile|admin` падает: `eslint-plugin-react-hooks@5` несовместим с ESLint 10
  (`context.getSourceCode is not a function`). Предсуществующее, к правкам не относится.
- `nx test mobile.api|admin.api` падает на `jest.config.ts` (`state.conditions.includes is not a function`).
- `ci/docker/mobile.api/*` скопирован из другого проекта («cah», pm2, порт 8080) и не совпадает
  с `docs/deployment.md` и именем ассета релиза. Требует переписывания.
- Корневой `.env` содержит устаревшие значения (в т.ч. `MONGO_DATABASE=froggo`) и подмешивается
  во все Nx-задачи — лучше удалить/переименовать.
- `rg` в этом окружении может отсутствовать — используй `grep -rn`.
- В `plays.service.ts` есть `TODO` про фильтрацию досок по published-состоянию.
- Названия: проект — **Dead Lines Inc.**; старые имена `froggo` в коде/конфигах быть не должно
  (ключи `deadLinesInc.*`, scope `@dead-lines-inc`, БД `deadLinesInc`).
