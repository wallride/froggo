# Dead Lines Inc.

Dead Lines Inc. is a puzzle game platform built as a TypeScript monorepo:
a mobile game, two backend APIs and a web admin panel.

## Stack

- Nx (integrated monorepo), pnpm, TypeScript strict, Node.js 24.11
- Expo / React Native (mobile), React + Vite (admin panel)
- NestJS (backends), MongoDB via the official driver

## Workspace

```
apps/      Applications: mobile, mobile.api, admin.api, admin
libs/      Shared libraries: common.models, common.api.*, backend.providers, frontend
docs/      Documentation
tools/     Release tooling
ci/        Docker environments
```

## Documentation

Start with [docs/ai-context.md](docs/ai-context.md) — the project map for people and agents.
Deployment and releases: [docs/deployment.md](docs/deployment.md),
[docs/reference/release-deploy.md](docs/reference/release-deploy.md).

## Development

The project follows:

- Conventional Commits
- Feature-first architecture
- Strict TypeScript
- Framework-independent domain layer

Each backend takes its environment (configuration path, port, secrets) from its own
`apps/<app>/.env` (not committed); start from `apps/<app>/.env.example`.

```
npx nx serve mobile.api
npx nx serve mobile
npx nx serve admin.api
npx nx serve admin
```
