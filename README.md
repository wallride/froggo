# Dead Lines Inc.

Dead Lines Inc. is a puzzle game platform built as a TypeScript monorepo.

## Stack

- Nx
- pnpm
- TypeScript
- Expo (planned)
- NestJS (planned)
- PostgreSQL (planned)

## Workspace

```
apps/      Applications
libs/      Shared libraries
docs/      Documentation
tools/     Project tooling
docker/    Docker environment
```

## Development

The project follows:

- Conventional Commits
- Feature-first architecture
- Strict TypeScript
- Framework-independent domain layer


## Run/serve commands
Each backend takes its environment (configuration path, port, secrets) from its own
`apps/<app>/.env` (not committed); start from `apps/<app>/.env.example`.
Releases and deployment: [docs/deployment.md](docs/deployment.md).
```
npx nx serve mobile.api
npx nx serve mobile
npx nx serve admin.api
npx nx serve admin
```
