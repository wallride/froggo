// Builds a backend app and packs it as its release archive:
//   node tools/release/pack-backend.mjs <project> <version>
// → dist/release/<project>.tar.gz         stable copy (what the container mounts)
// → dist/release/<project>-v<version>.tar.gz  the same archive under the name it
//                                            gets as a GitHub release asset
// Contents: main.js, package.json (carrying the version), pnpm-lock.yaml — what
// the container installs and runs — plus what the app needs at runtime, baked
// in so a deployment mounts nothing: the content configuration (next to
// main.js, where main.ts looks for it by default) and, for the mobile API, the
// asset files (avatars). Paths are resolved from the workspace root, so it
// works from any directory (semantic-release runs it from the app).
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { workspaceRoot } from './workspace.mjs';

const [project, version] = process.argv.slice(2);
if (!project || !version) {
  console.error('Usage: node tools/release/pack-backend.mjs <project> <version>');
  process.exit(1);
}

execFileSync('npx', ['nx', 'run', `${project}:build`, '--skip-nx-cache'], {
  cwd: workspaceRoot,
  stdio: 'inherit',
});

// What the app reads at runtime, by project: from → to, both relative to the
// workspace root and the build directory. The configuration file is the
// content one (no secrets, no environment paths).
const RUNTIME_FILES = {
  'mobile.api': [
    { from: '.mount/cfg/mobile-api-configuration.json', to: 'configuration.json' },
    { from: '.mount/assets', to: 'assets' },
  ],
  'admin.api': [{ from: '.mount/cfg/admin-api-configuration.json', to: 'configuration.json' }],
};

const buildDir = path.join(workspaceRoot, 'dist', 'apps', project);
const packageJsonPath = path.join(buildDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.version = version;
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

for (const { from, to } of RUNTIME_FILES[project] ?? []) {
  const source = path.join(workspaceRoot, from);
  const destination = path.join(buildDir, to);
  if (!fs.existsSync(source)) {
    console.error(`${project}: ${from} is missing, nothing to pack from it`);
    process.exit(1);
  }
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(source, destination, { recursive: true });
}

const releaseDir = path.join(workspaceRoot, 'dist', 'release');
fs.mkdirSync(releaseDir, { recursive: true });

const archive = path.join(releaseDir, `${project}.tar.gz`);
execFileSync('tar', ['-czf', archive, '-C', buildDir, '.'], { stdio: 'inherit' });

// GitHub names a release asset after the file, so the versioned copy is the one
// that gets uploaded.
const versionedArchive = path.join(releaseDir, `${project}-v${version}.tar.gz`);
fs.copyFileSync(archive, versionedArchive);

console.log(`Packed ${project} ${version}: ${archive}, ${versionedArchive}`);
