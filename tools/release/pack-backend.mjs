// Builds a backend app and packs it as its release archive:
//   node tools/release/pack-backend.mjs <project> <version>
// → dist/release/<project>.tar.gz with main.js, package.json (carrying the
// version) and pnpm-lock.yaml — what the container installs and runs. Run
// from the workspace root.
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const [project, version] = process.argv.slice(2);
if (!project || !version) {
  console.error('Usage: node tools/release/pack-backend.mjs <project> <version>');
  process.exit(1);
}

execFileSync('npx', ['nx', 'run', `${project}:build`, '--skip-nx-cache'], { stdio: 'inherit' });

const buildDir = path.join('dist', 'apps', project);
const packageJsonPath = path.join(buildDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.version = version;
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

const releaseDir = path.join('dist', 'release');
fs.mkdirSync(releaseDir, { recursive: true });
const archive = path.join(releaseDir, `${project}.tar.gz`);
execFileSync('tar', ['-czf', archive, '-C', buildDir, '.'], { stdio: 'inherit' });
console.log(`Packed ${project} ${version}: ${archive}`);
