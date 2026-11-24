               # Инструкция по релизу

Короткая практическая инструкция: где лежат настройки, как выпустить релиз, что при этом
происходит и что делать, если он сорвался. Полное описание схемы — в
[deployment.md](deployment.md), расхождения и открытые вопросы — в
[reference/release-deploy.md](reference/release-deploy.md).

Релизятся два бэкенда: `mobile.api` и `admin.api`. Mobile-приложение в магазины выпускается
руками (см. [«Мобильное приложение»](#мобильное-приложение)).

## Где настройки

Настройки semantic-release — обычный `.releaserc.json` в папке приложения:

```
apps/mobile.api/.releaserc.json
apps/admin.api/.releaserc.json
```

semantic-release сам ищет `.releaserc.json` в том каталоге, из которого его запустили, —
поэтому цель Nx `release` просто запускает его в папке приложения (`cwd: {projectRoot}`),
ни `--extends`, ни общего конфига в `tools/` нет. Всё, что относится к релизу приложения,
лежит в одном файле:

```json
{
  "branches": ["main"],
  "tagFormat": "mobile.api-v${version}",
  "plugins": [
    ["../../tools/release/project-commits.mjs", { "project": "mobile.api", "preset": "conventionalcommits" }],
    ["@semantic-release/exec", { "prepareCmd": "node ../../tools/release/pack-backend.mjs mobile.api ${nextRelease.version}" }],
    ["../../tools/release/publish-backend.mjs", { "project": "mobile.api" }]
  ]
}
```

Три плагина:

| Плагин | Что делает |
|---|---|
| `tools/release/project-commits.mjs` | версия и заметки только по коммитам, которые меняли приложение или workspace-библиотеки, от которых оно зависит (граф Nx) |
| `@semantic-release/exec` | `prepareCmd` собирает приложение и пакует архив: `tools/release/pack-backend.mjs <app> <version>` |
| `tools/release/publish-backend.mjs` | до тега проверяет доступ к GitHub, после — создаёт/обновляет релиз и заливает архив (через `gh`, см. `gh-release.mjs`) |

Пути к плагинам указаны **от папки приложения** (`../../tools/...`), потому что конфиг
лежит в ней. Скрипты в `tools/release/` не зависят от текущего каталога: корень воркспейса
они берут из `tools/release/workspace.mjs`.

Добавить/убрать шаг релиза (например, `@semantic-release/git` или `@semantic-release/changelog`)
— это правка `plugins` в `.releaserc.json` приложения. Порядок шагов semantic-release задаёт сам
по именам функций, которые экспортирует плагин.

## Один раз перед первым релизом

- Ветка `main` запушена в GitHub, локальная совпадает с удалённой: semantic-release
  проверяет это и пушит тег.
- Установлен и авторизован `gh` CLI: `gh auth status`.
- Токен с правом `contents: write` на репозиторий — в переменной окружения `GH_TOKEN`
  (годится и `GITHUB_TOKEN`, но `GH_TOKEN` главнее — его использует `gh`).
  Токен в файлы не кладётся.

## Релиз

Версию semantic-release считает по коммитам ([Conventional Commits](https://www.conventionalcommits.org/))
с прошлого тега этого приложения: `fix:` → патч, `feat:` → минор, `!` или `BREAKING CHANGE:`
→ мажор. `chore/docs/refactor` релиза не дают. Учитываются только коммиты, затрагивающие
приложение или его зависимости по графу Nx: коммит в `libs/common/models` поднимет версию
обоим API, коммит только в `apps/mobile` — ни одному.

1. Посмотреть, что получится, ничего не меняя:

   ```bash
   GH_TOKEN=$(gh auth token) npx nx run mobile.api:release --dry-run
   ```

   В выводе — найденные коммиты, посчитанная версия, заметки и предупреждение, если с
   доступом к GitHub что-то не так (в dry-run это только предупреждение).

2. Выпустить:

   ```bash
   GH_TOKEN=$(gh auth token) npx nx run mobile.api:release
   ```

3. Для второго бэкенда — то же с `admin.api:release` (можно подряд, они независимы).

Что происходит по шагам:

1. Проверяется доступ к GitHub (`gh`, авторизация, право `contents: write`) — **до** тега.
   Если проверка не прошла, тег не создаётся и ничего не ломается.
2. Считается версия и пишутся заметки к релизу.
3. Приложение собирается (`nx run <app>:build --skip-nx-cache`) и пакуется в
   `dist/release/<app>.tar.gz`; версия вписывается в `package.json` внутри архива, рядом
   кладётся копия `<app>-v<version>.tar.gz` — под этим именем архив уходит в релиз.
4. Ставится и пушится тег `<app>-v<version>`, например `mobile.api-v1.2.0`.
5. Создаётся GitHub Release с заметками и архивом.

В репозиторий ничего не коммитится, в npm ничего не публикуется. Первый релиз приложения — `1.0.0`.

Повторный запуск безопасен: если релиз уже опубликован, ничего не изменится (нет новых
коммитов — нет релиза); если нет — он досоздастся, архив перезальётся.

## Если релиз прервался

semantic-release ставит тег **до** публикации релиза, поэтому сбой на публикации (протух
токен, оборвалась заливка) оставляет тег без GitHub Release. Повторный запуск релиза в этом
случае ничего не делает — новых коммитов нет.

Сначала просто запустить релиз ещё раз: если доступа к GitHub уже хватает, релиз досоздастся
с той же версией. Если не помогло —

```bash
npx nx run mobile.api:repair-release            # последний тег
npx nx run mobile.api:repair-release 1.0.1      # конкретная версия
npx nx run mobile.api:repair-release --dry-run  # только показать план
npx nx run mobile.api:repair-release --force    # перезаписать существующий релиз
```

Скрипт `tools/release/repair-release.mjs` берёт тег `<app>-v<version>`, собирает заметки по
коммитам между предыдущим тегом и этим, берёт архив из `dist/release` (или собирает его из
помеченного коммита, если HEAD на нём) и публикует релиз. Если архива нет, а HEAD не
совпадает с тегом, скрипт остановится: нельзя публиковать код из-под другого коммита — нужно
сделать `git checkout <tag>` и повторить.

## Мобильное приложение

Магазинную сборку semantic-release не делает: версия приложения — это `version` в
`apps/mobile/app.json` (её и отправляет в API заголовок `X-App-Version`).

При выпуске новой версии в магазин:

1. Поднять `version` в `apps/mobile/app.json` (`x.y.z`, без номера сборки).
2. Собрать приложение через EAS и залить сборку в магазин (см. ниже).
3. Пока магазин не разнёс обновление, старые версии должны продолжать работать: поднимать
   `MINIMUM_APP_VERSION` в окружении API (не в конфиге — он теперь только контентный)
   только когда новая версия уже доступна в магазине. Ниже этой версии клиент получает `426` и показывает модалку
   «Мобильное приложение необходимо обновить».
4. Ссылки на магазины — `apps/mobile/src/api/app-store-url.ts`: Android уже смотрит на
   `com.deadlinesinc.mobile`, ссылка на iOS — заглушка до первой публикации.

### Сборка через EAS

Приложение привязано к Expo: `expo.dev/accounts/wallride/projects/mobile`, id проекта —
`apps/mobile/app.json` → `extra.eas.projectId`. Идентификатор на обеих платформах —
`com.deadlinesinc.mobile`. Профили сборки — `apps/mobile/eas.json`:

| Профиль | Что собирает |
|---|---|
| `preview` | APK с внутренней раздачей (Android) и сборка под симулятор (iOS) — чтобы проверить на устройстве |
| `production` | Android App Bundle для Google Play; для iOS — сборка под TestFlight |
| `development` | development client; требует пакета `expo-dev-client`, сейчас он не установлен |

Команды запускаются из `apps/mobile`:

```bash
eas build --profile preview --platform android      # APK для проверки
eas build --profile production --platform android   # AAB для Google Play
eas submit --platform android --profile production  # залить AAB в Play Console
eas build --profile production --platform ios       # сборка под App Store Connect
```

`cli.appVersionSource` = `remote`: `versionCode`/`buildNumber` ведёт EAS и поднимает на каждой
сборке, а `version` в `app.json` остаётся маркетинговой версией — её клиент отправляет в
заголовке `X-App-Version`. Ключ подписи Android хранится на серверах Expo (`eas credentials`),
в репозиторий ничего не кладётся.

Lockfile-проверка: `pnpm-workspace.yaml` не объявляет `apps/*` пакетами воркспейса, поэтому EAS
не находит корневой `pnpm-lock.yaml` и останавливается на проверке. Сборка запускается с
`EAS_BUILD_SKIP_LOCKFILE_CHECK=1`:

```bash
EAS_BUILD_SKIP_LOCKFILE_CHECK=1 eas build --profile preview --platform android
```

Зависимости в `apps/mobile/package.json` поэтому зафиксированы теми же версиями, что в корневом
`package.json` (без `*`).

## Где смотреть подробности

- `docs/deployment.md` → раздел «Релиз» — полная схема, токены, архив, деплой.
- `docs/reference/release-deploy.md` — краткая выжимка, расхождения с Docker-обвязкой.
- `tools/release/*.mjs` — код шагов релиза (комментарии в файлах).
