// semantic-release plugin that publishes an app's release on GitHub.
//
// Replaces @semantic-release/github, whose publish runs after semantic-release
// has already tagged and pushed the commit: if it fails (an expired token, a
// failed asset upload, a draft left behind), the tag stays without a release and
// a re-run can't fix it. Here verifyConditions checks that releases can be
// published at all — before anything is tagged — and publish is idempotent, so
// running the release again completes whatever was left half-done.
import * as path from 'node:path';

import { assertGithubReady, publishRelease } from './gh-release.mjs';
import { workspaceRoot } from './workspace.mjs';

// The versioned archive pack-backend.mjs leaves next to the stable one: GitHub
// names an asset after its file, so this is the name it gets there.
export function releaseAssetPath(project, version) {
  return path.join(workspaceRoot, 'dist', 'release', `${project}-v${version}.tar.gz`);
}

export function releaseTitle(project, version) {
  return `${project} ${version}`;
}

export async function verifyConditions(pluginConfig, context) {
  if (!pluginConfig.project) {
    throw new Error('publish-backend: the "project" option is required');
  }

  try {
    const repository = assertGithubReady(workspaceRoot);
    context.logger.log('GitHub releases will be published to %s', repository);
  } catch (error) {
    // A dry run changes nothing, so it shouldn't demand credentials: it's the
    // way to look at the version and the notes. A real run must fail here —
    // before the tag exists.
    if (!context.options?.dryRun) throw error;
    context.logger.warn(
      'GitHub releases would fail (dry run, so only a warning): %s',
      String(error.message).split('\n')[0],
    );
  }
}

export async function publish(pluginConfig, context) {
  const { project } = pluginConfig;
  const { nextRelease, logger } = context;

  logger.log('Publishing the GitHub release %s', nextRelease.gitTag);

  publishRelease({
    cwd: workspaceRoot,
    tag: nextRelease.gitTag,
    title: releaseTitle(project, nextRelease.version),
    notes: nextRelease.notes,
    assets: [releaseAssetPath(project, nextRelease.version)],
  });
}
