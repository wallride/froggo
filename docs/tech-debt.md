# Technical Debt

Conscious compromises accepted during development. Each item: description, reason, planned resolution.

## Tooling

- **`nx lint mobile|admin` fails** — `eslint-plugin-react-hooks@5.0.0` is incompatible with
  ESLint 10 (`context.getSourceCode is not a function`). Reason: dependency bump without
  checking the plugin. Fix: upgrade to a plugin version supporting ESLint 10 (or pin ESLint 9).
- **`nx test mobile.api|admin.api` fails before running tests** — `jest.config.ts` cannot be
  parsed (`state.conditions.includes is not a function`, jiti/jest-util mismatch).
  Reason: mixed jest 29/30 packages. Fix: align jest/jest-util/jiti versions.
- **Root `.env`** holds stale values (`MONGO_DATABASE=froggo`) and is mixed by Nx into every
  task. Fix: delete it; per-app env files are enough.
- **`rg` is not always available** in the environment — use `grep -rn` in scripts/docs.

## Deployment

- `ci/docker/mobile.api/` (Dockerfile, README, .env.example) is copied from another project
  («cah»: pm2, port 8080, `/home/cah`) and does not match `docs/deployment.md` or the release
  asset name. Fix: rewrite per `docs/reference/release-deploy.md`.
- No Dockerfile/compose for `admin.api` yet, although the deployment docs cover both services.
- `docs/deployment.md` still references the old repository name in release URLs.

## Domain / backend

- `plays.service.ts`: boards are not filtered by published state (`// TODO filter boards by
  published state`) — every board file is playable.
- `libs/backend/processors` (`IPlayProcessor`) is a placeholder, not wired to the API.
- `PlayerAuthProviderEnum` has `google`/`bot`, but only `anonymous` (device id) is accepted;
  others need a provider token verification flow.
- Scoring constants exist twice (server `plays.service.ts`, client `useBoardGame`); the server
  sends them in `startPlay`, but the client also hardcodes them.
- Admin panel and `admin.api` have no authentication — must stay on a private network.
