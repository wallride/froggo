# Admin panel (`apps/admin`)

React + Vite + react-router-dom + CSS-модули. Отдельное SPA для наполнения и проверки досок.

## Структура

```
src/main.tsx                 точка входа
src/app/app.tsx              роуты: / (Dashboard), /boards, /boards/add, /boards/edit, /boards/test, /players
src/app/layout/layout.tsx    сайдбар (Dashboard / Boards / Players) + Outlet
src/app/pages/
  dashboard/dashboard.tsx
  boards/boards.tsx          список досок
  boards/add/board-add.tsx   создание (POST)
  boards/edit/board-edit.tsx редактирование (PUT)
  boards/test/board-test.tsx проигрывание доски
  boards/board-editor/       общий редактор клеток
  boards/generate-board.ts   генератор: цели по одной в строке/столбце/регионе, без соседей
  players/players.tsx        заглушка (только заголовок)
src/api/                     api-container.ts (DI-контейнер), api-context.tsx, board-api.ts, api-config.ts
```

## Связь с backend

- `api-config.ts`: `VITE_API_BASE_URL ?? ''` — по умолчанию запросы относительные и идут через
  прокси Vite dev-сервера (`vite.config.mts`), поэтому CORS не нужен.
- `board-api.ts` реализует `IBoardAPI` из `@dead-lines-inc/common.api.admin`
  (`getAll / getById / add / update`) → `apps/admin.api` (`/api/boards`).
- `apiContainer` + `ApiProvider` дают страницам доступ к API (без прямых fetch в компонентах).
- Валидация досок: `validateBoard` из `@dead-lines-inc/common.models` (та же, что в генераторе
  и в схеме `boardSchema`).

## Важно

- Авторизации нет (admin.api рассчитан на приватную сеть) — не выставлять наружу.
- Цвета регионов — `kindColors` из `@dead-lines-inc/frontend`, едины с мобильной игрой.
- Dev: `npx nx serve admin`; сборка: `npx nx build admin` (Vite, статика — можно раздавать любым nginx).
