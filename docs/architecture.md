# Architecture

## Principles

- Monorepo (Nx), pnpm workspace
- TypeScript Strict
- Feature-first
- Named exports only
- Framework-independent domain layer: types and rules live in `libs/common/models` /
  `libs/backend/providers`, never in UI or controllers

## Workspace layout

```
apps/      mobile (Expo), mobile.api (NestJS), admin.api (NestJS), admin (React + Vite)
libs/      common/models, common/api/{mobile,admin}, backend/{providers,processors}, frontend
ci/        docker environments (mongo, backends)
tools/     release tooling (semantic-release config, archive packing)
docs/      documentation; start at ai-context.md
```

Detailed map, data flow and rules: [ai-context.md](ai-context.md).
Area references: [reference/](reference/).
