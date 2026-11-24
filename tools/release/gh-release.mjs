// GitHub releases through the `gh` CLI.
//
// Why not @semantic-release/github: semantic-release creates and pushes the git
// tag *before* plugins publish, so a failure while publishing leaves a tag
// without a release — and a re-run does nothing, because there are no commits
// after the tag. The calls here are idempotent instead: running them again
// updates the release that's already there, publishes it if it's a leftover
// draft, and re-uploads the asset (--clobber), so a failed attempt is finished
// by simply running the release again.
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

function gh(args, cwd) {
  return execFileSync('gh', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function failureText(error) {
  return [error?.stderr, error?.stdout, error?.message]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join('\n');
}

// Fails before anything is tagged if releases can't be published. Without this,
// a token that is missing, expired or not allowed to push is discovered only
// after the tag is already on GitHub.
export function assertGithubReady(cwd) {
  try {
    gh(['--version'], cwd);
  } catch {
    throw new Error(
      'The GitHub CLI (gh) is required to publish releases: https://cli.github.com',
    );
  }

  let repository;
  try {
    repository = gh(
      ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'],
      cwd,
    ).trim();
  } catch (error) {
    const text = failureText(error);
    // "gh auth status" isn't used on purpose: it exits non-zero when *any*
    // stored account is broken, so one stale keyring entry fails the check even
    // though the token in use (GH_TOKEN) is fine. Asking for the repository
    // proves the token that would actually be used.
    if (/auth|token|credential|Bad credentials|401/i.test(text)) {
      throw new Error(
        'GitHub authentication is not usable — set GH_TOKEN (contents: write) ' +
          `or run "gh auth login".\n${text}`,
      );
    }
    throw new Error(
      `The repository isn't reachable with this token (it needs contents: write).\n${text}`,
    );
  }

  // Publishing a release writes to the repository, so read access is not
  // enough. `.permissions` can be absent for some token types: only an explicit
  // "false" blocks the release, a missing answer is left to the actual call.
  try {
    const canPush = gh(
      ['api', `repos/${repository}`, '--jq', '.permissions.push'],
      cwd,
    ).trim();
    if (canPush === 'false') {
      throw new Error(
        `The token can read ${repository} but not write to it: releases need contents: write.`,
      );
    }
  } catch (error) {
    if (error.message?.includes('contents: write')) throw error;
    // The check itself failed (an older gh, a token that hides permissions):
    // the repository lookup above already proved the token works.
  }

  return repository;
}

export function releaseExists(cwd, tag) {
  try {
    gh(['release', 'view', tag, '--json', 'tagName'], cwd);
    return true;
  } catch (error) {
    const text = failureText(error);
    // Only "no such release" means it's missing; anything else (auth, network)
    // must fail the release rather than silently create a duplicate.
    if (/not found|HTTP 404/i.test(text)) return false;
    throw new Error(`Can't look up the GitHub release ${tag}:\n${text}`);
  }
}

// Creates the release for a tag that's already on GitHub, or updates the one
// that's there (including a draft left by a failed attempt). Assets are
// uploaded by their file names, so a versioned copy must be passed (see
// pack-backend.mjs).
export function publishRelease({ cwd, tag, title, notes, assets = [] }) {
  for (const asset of assets) {
    if (!fs.existsSync(asset)) {
      throw new Error(`Release asset is missing: ${asset}`);
    }
  }

  const notesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dead-lines-release-'));
  const notesFile = path.join(notesDir, 'notes.md');
  fs.writeFileSync(notesFile, notes?.trim() ? `${notes.trim()}\n` : '');

  try {
    const hasNotes = fs.statSync(notesFile).size > 0;

    if (releaseExists(cwd, tag)) {
      gh(
        [
          'release',
          'edit',
          tag,
          '--title',
          title,
          // A draft is invisible on the public repo page: publish it.
          '--draft=false',
          ...(hasNotes ? ['--notes-file', notesFile] : []),
        ],
        cwd,
      );
      console.log(`Updated the GitHub release ${tag}`);
    } else {
      gh(
        [
          'release',
          'create',
          tag,
          '--title',
          title,
          // The tag is pushed by semantic-release before publishing: refuse to
          // create a release on some other commit.
          '--verify-tag',
          ...(hasNotes ? ['--notes-file', notesFile] : ['--generate-notes']),
        ],
        cwd,
      );
      console.log(`Created the GitHub release ${tag}`);
    }

    for (const asset of assets) {
      gh(['release', 'upload', tag, asset, '--clobber'], cwd);
      console.log(`Uploaded ${path.basename(asset)} to ${tag}`);
    }
  } finally {
    fs.rmSync(notesDir, { recursive: true, force: true });
  }
}
