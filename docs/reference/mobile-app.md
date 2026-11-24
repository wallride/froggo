# Mobile app (`apps/mobile`)

Expo 57 / RN 0.86 + react-native-web. Архитектура: «гейты» прогрева + контексты.
Вся бизнес-логика экранов живёт в хуках (`useBoardGame`, `use*`), экран — разметка.

## Дерево запуска (`src/app/App.tsx`)

```
AppFrame (9:16 на широких экранах)
└ StartupProgressProvider
  └ FontsGate            — useFonts(fontAssets); шрифты не блокируют навсегда (ошибка = фолбэк)
    └ AppProviders       — ConfigurationProvider
      └ ConfigurationGate — GET /api/configuration, затем prefetchAvatars
        └ PlayerProvider  — identify по deviceId, токен в authSession
          └ PlayerGate    — нет игрока → Onboarding; иначе Navigation
            └ Navigation  — native-stack
  └ StartupScreen        — оверлей прогресса поверх всего
```

Прогресс-бар: взвешенные стадии `fonts:1, images:2, configuration:1, avatars:2, player:1, home:1`;
`useStartupStage(stage, isDone, error?, retry?)` из `src/startup/startup-progress.tsx`.
Тексты оверлея вшиты (`startup-texts.ts`, en/ru) — он должен работать до загрузки конфигурации.

Порядок важен: `ConfigurationGate` нужен раньше идентификации, потому что маршруты API приходят
в конфигурации.

## API-слой (`src/api`)

| Файл | Роль |
|---|---|
| `api-config.ts` | `API_BASE_URL = EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'` — build-time, не секрет |
| `app-version.ts` / `app-fetch.ts` | `APP_VERSION` из `app.json` (`expo-constants`); `appFetch` добавляет `X-App-Version` на каждый запрос и на 426 показывает алерт обновления. Тот же `APP_VERSION` экран настроек показывает внизу подписью «Версия приложения: x.y.z» (`screens.settings.appVersion`, подстановка `{version}` через `formatText`) |
| `app-update.ts` / `.web.ts` | Модалка «необходимо обновить»: `Alert` (Android без отмены, после «Обновить» — `exitApp`; iOS остаётся в фоне) и блокирующий DOM-оверлей на web; тексты — в бандле (`app-update-texts.ts`), URL магазина — заглушки в `app-store-url.ts` |
| `api-url.ts` | `apiUrl(api, route)` = `api.baseUrl ?? API_BASE_URL` + путь из конфигурации; `assetUrl` — то же для ассетов |
| `configuration-api.ts` | `ConfigurationAPI` → фиксированный `CONFIGURATION_ROUTE` |
| `player-api.ts` / `play-api.ts` | реализации `IPlayerAPI` / `IPlayAPI`; каждый ответ парсится Zod-схемой |
| `auth-session.ts` | `authSession.fetch()`: подставляет `Authorization: Bearer`, на 401 один раз переидентифицирует (общий promise) и повторяет запрос |
| `use-apis.ts` | `useApis()` → `{playerApi, playApi}`, мемоизированы по `api` из конфигурации |
| `pending-play-results.ts` | очередь неотправленных результатов: файл `pending-play-results.json` в document dir, на web — localStorage; `queuePendingPlayResult` / `flushPendingPlayResults` |

Клиент **не хардкодит пути**: их присылает сервер в `configuration.api.routes`.

**Принудительное обновление.** Сервер отвечает `426` на любой запрос (включая `/api/configuration`),
если версия сборки ниже `minimumAppVersion` (см. backend.md). `appFetch` в этом случае вызывает
`requireAppUpdate()`: на iOS/Android — системный `Alert` с единственной кнопкой «Обновить» (без
отмены), на web — блокирующий оверлей. Тексты вшиты в бандл (ru/en по языку устройства), потому что
конфигурация к этому моменту может быть недоступна. Кнопка открывает страницу приложения в магазине
(`app-store-url.ts`, пока заглушки). На Android после открытия магазина приложение закрывается
(`BackHandler.exitApp`); на iOS закрыть приложение нельзя — оно уходит в фон, а при возврате алерт
показывается снова (подписка на `AppState`).

## Конфигурация (`src/configuration/configuration-context.tsx`)

- Язык: сохранённый (`language-storage.ts`, ключ `deadLinesInc.language`) → языки устройства
  (expo-localization / `Intl`) → первый из поддерживаемых.
- `changeLanguage(code)` — перезапрос конфигурации; если JSON API-части не изменился, старая
  ссылка на `api` сохраняется (клиенты не пересоздаются).
- `reload()` — повтор после ошибки; `useConfiguration()` бросает вне `ConfigurationGate`.
- Хуки: `useConfiguration()`, `useConfigurationState()`, `useLanguage()`.

## Идентичность (`src/identity`)

- `device-id.ts`: `deadLinesInc.deviceId` в expo-secure-store (web — localStorage), `Crypto.randomUUID()`.
  Значение — секрет устройства, на сервер уходит и там хешируется.
- `player-context.tsx`: `identify` при старте → `authSession.setAccessToken` → `player`, `avatars`;
  `setReauthenticate` для продления токена; `completeOnboarding()` при первом запуске сначала
  `register` (возвращает токен), затем `complete-onboarding`; `retry()`.
- `PlayerGate`: держит приложение пока `loading`; при ошибке — экран ошибки со стадией `player`;
  `player.isOnboarded === false` → `Onboarding` (инвайт + туториал), иначе `children`.

## Навигация и экраны (`src/app/Navigation.tsx`, `src/screens`)

```ts
RootStackParamList = {
  Home; Play: { playType, challenge?, challengeParticipation? };
  Penalty;               // та же форма, что Leaderboard: реклама и переход дальше
  Leaderboard: { challenge, challengeParticipation?, previousLeaderboard?, fromHome? };
  Archive; DailyTasks; Settings; Profile;   // Archive/DailyTasks — заглушки
}
```
Без шапки: Home, Play, Penalty, Leaderboard. Остальные — шапка из темы `@dead-lines-inc/frontend`.

- `HomeScreen` — Death + анимация реплики (задержка 1с, 0.8с, `Easing.out(back(1.4))`), карточки
  режимов, активные челленджи (перезапрос при фокусе и `AppState === 'active'`).
- `PlayGate` — `playApi.startPlay()` перед показом доски, затем `flushPendingPlayResults`, снимок
  `previousLeaderboard` для анимации мест.
- `PlayBoard/` — игровое поле и всё вокруг:
  - `useBoardGame(board, cellSize, {autoMarkAroundTargets, loseOnFirstMistake})` — ядро:
    клетки, звёзды (`MAX_STARS = 3`), счёт (`TARGET_SCORE = 50`, `FREE_CELL_SCORE = 1`),
    время, история, pan-responder, авто-отметки вокруг целей (`100 мс` шаг, `1000 мс` задержка),
    двойной тап `400 мс`;
  - `usePlayResultSubmission` — по завершении отправляет play + history, оффлайн кладёт в очередь;
  - `usePlayHistory`, `useElapsedPlayTime`, `useStarMultiplier`, `useScoreAnimation`;
  - `*PlayStatusRow` (score/time/accuracy), `BoardGrid`/`BoardCell`/`BoardFrame`, `PlayResultOverlay`,
    `ScoreFlightsLayer`, `MultiplierStarFlight`, `PlayTimeline`, `boardLayout.ts`, `targetReveal.ts`.
- `Leaderboard/` — `useLeaderboardData`, `LeaderboardRow`, `formatLeaderboardValue` (зависит от типа),
  `formatPresence` (online / «был N минут назад»).
- `PenaltyScreen` — реклама (interstitial, `ads/penaltyAd.ts` / `.web.ts` no-op) и переход дальше.
- `SettingsScreen` — язык, профиль; `ProfileScreen` — имя и аватар.

## Тексты (`src/localization/texts.ts`)

Фразы приходят с сервера в виде `string | string[]` (варианты). `pickText(text, previous)`
выбирает вариант, отличный от предыдущего; `resolveTexts(section)`, `formatText(text, vars)`
(`{name}`), хуки `useTexts('playBoard')` и т.п. — по разделам `MobileTexts`.
`useTexts` выбирает варианты один раз за монтирование; `useRepickedText(section, key, revision)`
перевыбирает одну фразу при каждом изменении `revision` — так цитата Смерти на Home меняется
при каждом возвращении на экран.

## Прочее

- `src/assets` — `fonts.ts`, `avatars.ts`, `cellTextures.ts`; `startup/preload-images.ts` прогревает картинки.
- `src/layout` — `app-frame.tsx` (телефонная рамка на web), `Screen.tsx`, `screen-backgrounds.ts`.
- `src/components` — `ChallengeResultPopup`, `ModeCard`, `PlayerAvatar`, `Ornament`, `isChallengeOver`.
- `src/onboarding` — `Onboarding` (инвайт → туториал), скрипт туториала `tutorial/tutorial-script.ts`,
  проигрывание `useTutorialPlayback`.
- Web-специфика: `disableWebZoom.ts`, суффикс `.web.ts` для рекламы, localStorage-фолбэки.
- `@dead-lines-inc/frontend` — `theme.ts` (`colors`, `fonts`), `kindColors.ts` (цвета регионов доски,
  общие с админкой).

## Чего не делать

- Не хардкодить адреса API и пути — только через конфигурацию/`apiUrl`.
- Не добавлять сетевые вызовы прямо в экран: слой `src/api` + Zod-парсинг ответа.
- Не менять правила счёта в одиночку: сервер отдаёт `scoresGained`, но клиент считает так же.
