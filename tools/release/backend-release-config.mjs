// semantic-release configuration of a backend app, shared by all of them.
// Each app has its own: apps/<app>/release.config.mjs, run from the workspace
// root as `nx run <app>:release` (see docs/deployment.md).
//
// A release of an app: its version from the commits that changed it (or the
// libraries it depends on) since its last release, the tag <app>-v<version>,
// and a GitHub release with the notes and the built app as
// <app>-v<version>.tar.gz. Nothing is committed or published to npm.
//
// The GitHub release is published by our own plugin rather than
// @semantic-release/github: it checks the token before anything is tagged and
// can be re-run to finish a release that failed halfway (see its comments).
import { fileURLToPath } from 'node:url';

const projectCommits = fileURLToPath(new URL('./project-commits.mjs', import.meta.url));
const publishBackend = fileURLToPath(new URL('./publish-backend.mjs', import.meta.url));

export function backendReleaseConfig(project) {
  return {
    branches: ['main'],
    tagFormat: `${project}-v\${version}`,
    plugins: [
      [projectCommits, { project, preset: 'conventionalcommits' }],
      [
        '@semantic-release/exec',
        {
          prepareCmd: `node tools/release/pack-backend.mjs ${project} \${nextRelease.version}`,
        },
      ],
      [publishBackend, { project }],
    ],
  };
}
