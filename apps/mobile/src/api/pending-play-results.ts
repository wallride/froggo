import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';

import { AcceptPlayResultsRequest } from '@dead-lines-inc/common.api.mobile';

import { PlayAPI } from './play-api';

const STORAGE_KEY = 'deadLinesInc.pendingPlayResults';

export type PendingPlayResult = AcceptPlayResultsRequest['plays'][number];

// expo-file-system has no web implementation, so fall back to localStorage
// there — same split as device-id.ts. Unlike that single small value, a
// play's history can be sizeable, which is why this uses a file rather than
// expo-secure-store (limited to ~2KB per value).
function getQueueFile(): File {
  return new File(Paths.document, 'pending-play-results.json');
}

function readAll(): PendingPlayResult[] {
  if (Platform.OS === 'web') {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }
  const file = getQueueFile();
  if (!file.exists) return [];
  const raw = file.textSync();
  return raw ? JSON.parse(raw) : [];
}

function writeAll(entries: PendingPlayResult[]): void {
  if (Platform.OS === 'web') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return;
  }
  const file = getQueueFile();
  if (!file.exists) file.create();
  file.write(JSON.stringify(entries));
}

// Queues a play result that failed to submit, so it can be retried later.
export function queuePendingPlayResult(entry: PendingPlayResult): void {
  writeAll([...readAll(), entry]);
}

// Retries every queued play result against the API. Results that fail again
// (still offline, server still down) are kept queued for the next attempt;
// everything else is dropped, whether it succeeded or failed for a reason a
// retry won't fix.
export async function flushPendingPlayResults(playApi: PlayAPI): Promise<void> {
  const pending = readAll();
  if (pending.length === 0) return;

  const stillPending: PendingPlayResult[] = [];
  for (const entry of pending) {
    try {
      await playApi.acceptPlayResults({ plays: [entry] });
    } catch {
      stillPending.push(entry);
    }
  }

  writeAll(stillPending);
}
