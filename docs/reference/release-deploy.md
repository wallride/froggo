# Release & deploy

Каноническая схема описана по-русски в [../deployment.md](../deployment.md) — она соответствует
коду и считается основной. Здесь — краткая выжимка и список расхождений.

## Релиз (semantic-release, отдельно для каждого бэкенда)

```
npx nx run mobile.api:release     # --dry-run — посмотреть без изменений
npx nx run admin.api:release
```
Нужен `GH_TOKEN` (или `GITHUB_TOKEN`) с `contents: write` (в файлы не кладётся), ветка `main`
должна быть запушена.

Что происходит:
1. `tools/release/project-commits.mjs` — кастомный плагин: берёт только коммиты, которые
   меняли приложение или workspace-проекты, от которых оно зависит (обход графа Nx,
   `NX_DAEMON=false`). Дальше вызывает штатные `analyzeCommits`/`generateNotes`.
2. Версия: `fix` → patch, `feat` → minor, `!`/`BREAKING CHANGE` → major; `chore/docs/refactor` — без релиза.
3. `tools/release/pack-backend.mjs` (`prepareCmd`) — `nx run <app>:build --skip-nx-cache`,
   записывает версию в `dist/apps/<app>/package.json`, пакует `dist/release/<app>.tar.gz`.
4. `tools/release/publish-backend.mjs` — публикация через `gh` CLI: в `verifyConditions`
   (до тега) проверяет `gh`/авторизацию/репозиторий, в `publish` создаёт релиз или
   обновляет существующий и перезаливает ассет (`--clobber`). Тег `<app>-v<version>`,
   ассет `dist/release/<app>-v<version>.tar.gz`.

Публикация идемпотентна: релиз, который есть, обновляется; архив перезаливается. Это важно,
потому что semantic-release ставит тег раньше публикации, и сбой на публикации иначе оставил
бы тег без релиза (повторный запуск не нашёл бы новых коммитов). `@semantic-release/github`
из зависимостей убран.

Если тег уже стоит, а релиза нет: `node tools/release/repair-release.mjs <app> [version]
[--dry-run] [--force]` или `npx nx run <app>:repair-release`. Скрипт берёт последний тег
`<app>-v*`, восстанавливает заметки по коммитам между предыдущим тегом и этим, использует
готовый архив из `dist/release` либо собирает его из помеченного коммита, затем публикует.

Архив: `main.js`, `main.js.map`, `package.json` (точные версии внешних зависимостей),
`pnpm-lock.yaml` (обрезанный), `configuration.json` (контентный конфиг из
`.mount/cfg/<app>-configuration.json`) и `assets/` (только mobile.api, из `.mount/assets`).
Секретов в архиве нет — они приходят через env. Репозиторий публичный → архив скачивается
без токена.

Первый релиз приложения — `1.0.0`. Конфиг приложения — обычный `apps/<app>/.releaserc.json`
(`branches`, `tagFormat`, `plugins`; пути к плагинам — от папки приложения). Цель Nx `release`
запускает `semantic-release` в папке приложения (`cwd: {projectRoot}`), поэтому `--extends`
нет. Скрипты в `tools/release/` не зависят от `process.cwd()`: корень воркспейса берут из
`tools/release/workspace.mjs`. Пошаговая инструкция — [../release.md](../release.md).

## Контейнер (целевая схема)

```
node:24.11.1-alpine
1. скачать https://github.com/<owner>/<repo>/releases/download/<app>-v<ver>/<app>-v<ver>.tar.gz
2. распаковать в /app
3. npm i -g pnpm@11 && pnpm install --prod --frozen-lockfile
4. MONGO_URI=... AUTH_TOKEN_SECRET=... MINIMUM_APP_VERSION=1.0.0 node main.js
   (PORT по умолчанию 3001/3000; конфиг читается из configuration.json рядом с main.js)
```

Ничего не монтируется: конфиг и аватары уже в архиве, доски — в MongoDB (коллекция
`boards`), остальное — env. Поэтому схема годится и для App Platform Timeweb, у которой
монтирований нет.

Секреты и переключатели — только env/секреты хостинга (`MONGO_URI`, `AUTH_TOKEN_SECRET`,
`MINIMUM_APP_VERSION`, `CORS_ALLOWED_ORIGINS`, `ASSETS_ROOT_PATH`, `ASSETS_PUBLIC_BASE_URL`).
Живость для healthcheck — `GET /api/health` (`{ status: 'ok' }`, без БД и без проверки
версии приложения).

## Что уже есть в репозитории

- `ci/docker/mongo/docker-compose.yaml` + `README.md` + `.env.example` — MongoDB 7 и
  mongo-express (`MONGO_ROOT_PASSWORD`, `MONGO_EXPRESS_PASSWORD`, порт express из env,
  том `mongo-data`). Годится для локального/тестового стенда.
- `ci/docker/mobile.api/` — **не готово**, см. ниже.
- `apps/<app>/.env.example` — шаблоны переменных (коммитятся), реальные `.env` — нет.

## Проблемы, которые надо закрыть перед деплоем

1. `ci/docker/mobile.api/Dockerfile` скопирован из другого проекта («cah»):
   `pm2-runtime /apps/cfg/pm2.json`, `/home/cah`, `EXPOSE 8080`, `mv /tmp/package /app`,
   `ARG REPOSITORY=git@github.com:wallride/froggo.git`, `npm i --omit=dev`.
   Не совпадает с deployment.md (`node main.js`, pnpm, порт 3001, без монтирований) и не
   работает с текущим архивом (`/tmp/app.tgz` распаковывается в корень, а не в `package/`).
2. Имя ассета: публикуется `<app>-v<version>.tar.gz`, Dockerfile ищет `$APP_NAME-$RELEASE.tgz`.
3. `README.md` в `ci/docker/mobile.api/` описывает старую схему (pm2, 8080, `/apps/cfg`).
4. `ci/docker/mobile.api/.env.example` дублирует `apps/mobile.api/.env.example`, но говорит
   про локальный Nx — оставить что-то одно.
5. Для `admin.api` нет ни Dockerfile, ни compose, хотя deployment.md описывает оба сервиса.
6. В `docs/deployment.md` URL релиза содержит `wallride/froggo` — проверить/поправить под
   актуальное имя репозитория (старое имя проекта в идентификаторах не используется).
7. Локальные `ci/docker/*/.env` содержат реальные значения — они gitignored, но при переносе
   стенда не должны попасть в коммит.

Закрыто: доски в MongoDB, `/api/health` вне `AppVersionGuard`, конфиг разделён на контент
(в архиве) и env, аватары запекаются в релиз — контейнеру больше не нужны монтирования.

Решение по стилю запуска (pm2 vs `node main.js`) ещё не зафиксировано: deployment.md и код
исходят из `node main.js`; если нужен pm2/перезапуск — добавить его осознанно в новый Dockerfile.
