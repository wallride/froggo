import * as os from 'node:os';
import type { AddressInfo } from 'node:net';

import { Configuration } from '../../Configuration';

/**
 * What the process actually uses, with credentials removed: startup logs go to
 * the platform's log storage, so the Mongo password and the token secret must
 * not end up there.
 */
export function describeConfiguration(configuration: Configuration): string {
  return [
    `node=${process.version}`,
    `pid=${process.pid}`,
    `env=${process.env['NODE_ENV'] ?? '-'}`,
    `mongo=${maskMongoUri(configuration.dependencies.mongo.uri)}`,
    `collection=${configuration.dependencies.boardProvider.collectionName}`,
    `minimumAppVersion=${configuration.minimumAppVersion}`,
    `tokenSecret=${configuration.auth.tokenSecret ? 'set' : 'missing'}`,
    `assets=${configuration.assets.rootPath}`,
    `cors=${configuration.cors?.allowedOrigins?.join(',') ?? 'any'}`,
  ].join(' ');
}

/**
 * The container's own identity on the network: which interfaces it has and what
 * it is called. When the platform's proxy reaches nothing, this is what tells
 * apart "the process listens on the wrong interface" from "nothing is routed
 * here at all".
 */
export function describeNetwork(): string {
  const addresses = Object.entries(os.networkInterfaces()).flatMap(
    ([name, entries]) =>
      (entries ?? [])
        .filter((entry) => !entry.internal && entry.family === 'IPv4')
        .map((entry) => `${name}=${entry.address}`),
  );

  return `hostname=${os.hostname()} addresses=${addresses.join(',') || '-'}`;
}

export function maskMongoUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    const database = parsed.pathname.replace(/^\//, '') || '-';
    return `${parsed.protocol}//${parsed.host}/${database}`;
  } catch {
    return '<unparseable uri>';
  }
}

/**
 * Where the HTTP server ended up listening. A container that listens on a port
 * the platform doesn't proxy looks alive in the logs yet receives no traffic,
 * so the resolved port is worth printing on its own.
 */
export function describeListenAddress(server: unknown): string {
  const address = (server as { address?: () => AddressInfo | string | null })
    .address?.();
  if (!address) {
    return '<no address>';
  }
  if (typeof address === 'string') {
    return address;
  }
  return `${address.address}:${address.port.toString(10)}`;
}
