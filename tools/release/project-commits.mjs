// semantic-release plugin for one project of the Nx workspace: decides the
// release type and writes the release notes like
// @semantic-release/commit-analyzer and release-notes-generator do, but only
// from the commits that changed the project or a workspace library it depends
// on — the others belong to other apps' releases.
//
// Options: { project: 'mobile.api', preset: 'conventionalcommits', ... } —
// everything but `project` goes to the two plugins as their own options.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

import { analyzeCommits as analyzeAllCommits } from '@semantic-release/commit-analyzer';
import { generateNotes as generateAllNotes } from '@semantic-release/release-notes-generator';

const require = createRequire(import.meta.url);

const rootsByProject = new Map();

// The project's folder and those of the workspace projects it depends on,
// directly or not, from the workspace root.
async function projectRoots(project) {
  if (rootsByProject.has(project)) return rootsByProject.get(project);
  // The daemon would keep the release process from exiting.
  process.env.NX_DAEMON = 'false';
  const { createProjectGraphAsync } = require('nx/src/devkit-exports');
  const graph = await createProjectGraphAsync({ exitOnError: true });
  if (!graph.nodes[project]) {
    throw new Error(`There's no project "${project}" in the workspace`);
  }
  const found = new Set([project]);
  const queue = [project];
  while (queue.length > 0) {
    for (const { target } of graph.dependencies[queue.shift()] ?? []) {
      // Only workspace projects: npm packages aren't nodes of the graph.
      if (graph.nodes[target] && !found.has(target)) {
        found.add(target);
        queue.push(target);
      }
    }
  }
  const roots = [...found].map((name) => graph.nodes[name].data.root);
  rootsByProject.set(project, roots);
  return roots;
}

async function projectContext({ project }, context) {
  if (!project) throw new Error('project-commits: the "project" option is required');

  const roots = await projectRoots(project);
  const range = context.lastRelease.gitHead ? `${context.lastRelease.gitHead}..HEAD` : 'HEAD';
  const touching = new Set(
    execFileSync('git', ['log', '--format=%H', range, '--', ...roots], {
      cwd: context.cwd,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean),
  );
  const commits = context.commits.filter((commit) => touching.has(commit.hash));
  context.logger.log(
    'Found %d of %d commits changing %s (%s)',
    commits.length,
    context.commits.length,
    project,
    roots.join(', '),
  );

  return { ...context, commits };
}

function ownOptions({ project, ...options }) {
  return options;
}

export async function analyzeCommits(pluginConfig, context) {
  return analyzeAllCommits(ownOptions(pluginConfig), await projectContext(pluginConfig, context));
}

export async function generateNotes(pluginConfig, context) {
  return generateAllNotes(ownOptions(pluginConfig), await projectContext(pluginConfig, context));
}
