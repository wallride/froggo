// Finishes a release that semantic-release tagged but never published on GitHub
// — what a failed publish (expired token, failed upload, leftover draft) leaves
// behind. semantic-release itself can't recover it: after the tag, there are no
// commits left to release, so a re-run does nothing.
//
//   node tools/release/repair-release.mjs <project> [version] [--dry-run] [--force]
//
// Without a version it takes the latest <project>-v<version> tag. Notes are
// rebuilt from the commits of that tag (the same ones semantic-release would
// have used: touching the project or a library it depends on). The archive is
// built if it's missing — only from the tagged commit, so a repaired release
// never contains later code. --force re-uploads the asset of an existing
// release.
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { projectRoots } from './project-commits.mjs';
import { assertGithubReady, publishRelease, releaseExists } from './gh-release.mjs';
import { releaseAssetPath, releaseTitle } from './publish-backend.mjs';
import { workspaceRoot } from './workspace.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const positional = args.filter((arg) => !arg.startsWith('--'));
const [project, requestedVersion] = positional;
const dryRun = flags.has('--dry-run');
const force = flags.has('--force');

if (!project) {
  console.error(
    'Usage: node tools/release/repair-release.mjs <project> [version] [--dry-run] [--force]',
  );
  process.exit(1);
}

// Everything below runs in the git repository, whatever folder we were started in.
const cwd = workspaceRoot;

function git(...gitArgs) {
  return execFileSync('git', gitArgs, { cwd, encoding: 'utf8' }).trim();
}

// Tags of this project, newest version first.
function projectTags() {
  const output = git('tag', '--list', `${project}-v*`, '--sort=-v:refname');
  return output ? output.split('\n').filter(Boolean) : [];
}

const tags = projectTags();
const tag = requestedVersion ? `${project}-v${requestedVersion}` : tags[0];

if (!tag) {
  console.error(`There's no ${project}-v<version> tag to repair`);
  process.exit(1);
}

const version = tag.slice(`${project}-v`.length);
const archive = releaseAssetPath(project, version);
const stableArchive = path.join(cwd, 'dist', 'release', `${project}.tar.gz`);

if (!git('tag', '--list', tag)) {
  console.error(`The tag ${tag} doesn't exist`);
  process.exit(1);
}

const tagCommit = git('rev-parse', `${tag}^{commit}`);
const headCommit = git('rev-parse', 'HEAD');
const previousTag = tags[tags.indexOf(tag) + 1];
const roots = await projectRoots(project);

function buildNotes() {
  const range = previousTag ? `${previousTag}..${tag}` : tag;
  const commits = execFileSync('git', ['log', range, '--pretty=format:* %s (%h)', '--', ...roots], {
    cwd,
    encoding: 'utf8',
  }).trim();

  return [
    `Recovered release: the tag ${tag} was pushed without a GitHub release.`,
    '',
    commits || '_No commits found._',
  ].join('\n');
}

// The archive is the one pack-backend made at the tagged commit; when only the
// stable copy is left (an earlier tool version kept just that one), it's the
// same file under another name.
function archiveState() {
  if (fs.existsSync(archive)) return 'ready';
  if (fs.existsSync(stableArchive)) return 'would be copied from the stable archive';
  return 'would be built';
}

if (dryRun) {
  console.log(`Tag:      ${tag} (${tagCommit})`);
  console.log(`Title:    ${releaseTitle(project, version)}`);
  console.log(`Asset:    ${archive}`);
  console.log(`Archive:  ${archiveState()}`);
  console.log(`Previous: ${previousTag ?? '(none)'}`);
  console.log(`Roots:    ${roots.join(', ')}`);
  console.log('\n--- notes ---\n');
  console.log(buildNotes());
  process.exit(0);
}

assertGithubReady(cwd);

if (releaseExists(cwd, tag) && !force) {
  console.log(`The GitHub release ${tag} already exists — nothing to repair (use --force to re-upload)`);
  process.exit(0);
}

// The archive must belong to the tagged commit: building HEAD instead would
// publish code from after the release.
if (!fs.existsSync(archive)) {
  if (fs.existsSync(stableArchive)) {
    console.log(`Using the stable archive ${stableArchive}`);
    fs.copyFileSync(stableArchive, archive);
  } else if (headCommit !== tagCommit) {
    console.error(
      `The archive ${archive} is missing, and HEAD (${headCommit.slice(0, 7)}) is not ` +
        `the tagged commit (${tagCommit.slice(0, 7)}).\n` +
        `Check out ${tag} and run it again, so the release contains the code it was made from.`,
    );
    process.exit(1);
  } else {
    console.log(`Building the archive for ${tag}...`);
    execFileSync('node', ['tools/release/pack-backend.mjs', project, version], {
      cwd,
      stdio: 'inherit',
    });
  }
}

// The stable copy isn't uploaded, but the container may want it: make sure one
// exists after a repair that rebuilt only the versioned archive.
if (!fs.existsSync(stableArchive)) {
  fs.mkdirSync(path.dirname(stableArchive), { recursive: true });
  fs.copyFileSync(archive, stableArchive);
}

publishRelease({
  cwd,
  tag,
  title: releaseTitle(project, version),
  notes: buildNotes(),
  assets: [archive],
});
