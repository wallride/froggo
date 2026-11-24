#!/usr/bin/env node
// Imports boards from the old file storage into MongoDB. Boards live in Mongo
// now (MongoBoardProvider); the app itself never reads these files. This is a
// one-off migration for a stand that still keeps boards as JSON files.
//
// Boards are matched by id (upsert), ids are kept as they are: challenges and
// play history refer to boards by id. Running the import twice is safe.
//
// Usage:
//   MONGO_URI='mongodb://...' node tools/migrate-boards-to-mongo.mjs \
//     [--dir .mount/storages/boards] [--database deadLinesInc] [--collection boards] [--dry-run]
//
// Exits non-zero if the connection fails or at least one board can't be
// imported.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';

import { MongoClient } from 'mongodb';

const { values: options } = parseArgs({
  options: {
    dir: { type: 'string', default: '.mount/storages/boards' },
    database: { type: 'string', default: 'deadLinesInc' },
    collection: { type: 'string', default: 'boards' },
    'dry-run': { type: 'boolean', default: false },
  },
});

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('MONGO_URI is not set: pass the connection string in the environment.');
  process.exit(1);
}

// Boards are validated by the app on read; here only the fields that identify
// a board are checked, so a broken file is reported instead of quietly stored.
function readBoard(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (typeof raw?.id !== 'string' || !raw.id) {
    throw new Error('no "id"');
  }
  if (!Number.isInteger(raw?.size) || !Array.isArray(raw?.cells)) {
    throw new Error('no "size" or "cells"');
  }
  return raw;
}

function listFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(entryPath);
  }
  return files;
}

const boardsDir = path.resolve(options.dir);
if (!fs.existsSync(boardsDir)) {
  console.error(`Board directory ${boardsDir} not found.`);
  process.exit(1);
}

const files = listFiles(boardsDir);
const boards = [];
let failed = 0;

for (const file of files) {
  try {
    boards.push(readBoard(file));
  } catch (error) {
    failed += 1;
    console.error(`Skipped ${path.relative(process.cwd(), file)}: ${error.message}`);
  }
}

console.log(
  `Found ${files.length} file(s): ${boards.length} board(s) to import, ${failed} skipped.`,
);

if (options['dry-run']) {
  for (const board of boards) console.log(`  ${board.id} (size ${board.size})`);
  console.log('Dry run: nothing written.');
  process.exit(failed ? 1 : 0);
}

if (boards.length === 0) {
  console.log('Nothing to import.');
  process.exit(failed ? 1 : 0);
}

const client = new MongoClient(mongoUri, { ignoreUndefined: true });

try {
  await client.connect();
  const collection = client.db(options.database).collection(options.collection);

  for (const board of boards) {
    await collection.replaceOne({ id: board.id }, board, { upsert: true });
  }

  await collection.createIndex({ id: 1 }, { unique: true });
  console.log(
    `Imported ${boards.length} board(s) into ${options.database}.${options.collection}.`,
  );
} finally {
  await client.close();
}

process.exit(failed ? 1 : 0);
