# Roadmap

## Where the project is now

Sprints 0–3 below are implemented in code (workspace and tooling, mobile app with navigation
and design system, both APIs with device-id auth and MongoDB, game modes and leaderboards,
admin board editor). The current focus is deployment for internal testing — see
[deployment.md](deployment.md) and [reference/release-deploy.md](reference/release-deploy.md).

## Sprint 0

- Workspace
- Tooling
- Documentation

## Sprint 1

- Expo
- Navigation
- Design system

## Sprint 2

- APIs
- Authentication
- Database

## Sprint 3

- Game mechanics

## Next

- Deployment on Timeweb: container images for both backends, mounted data, secrets
- Board publish state (see the TODO in `plays.service.ts`)
- Providers other than anonymous (Google), bot players for real challenges
- Archive and daily tasks screens (currently placeholders)
