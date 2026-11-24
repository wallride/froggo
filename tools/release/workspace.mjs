// The Nx workspace root: apps/, libs/, tools/ and dist/ live in it.
//
// Releases are run from an app's own folder — semantic-release looks for
// .releaserc.json in the directory it runs in — so the release tools must not
// rely on process.cwd(): they resolve everything from here.
//
// The Nx daemon would keep the release process from exiting, hence NX_DAEMON.
process.env.NX_DAEMON = 'false';

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const devkit = require('nx/src/devkit-exports');

export const workspaceRoot = devkit.workspaceRoot;
export const createProjectGraphAsync = devkit.createProjectGraphAsync;
