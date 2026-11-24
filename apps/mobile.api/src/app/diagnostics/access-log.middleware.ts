import { Logger } from '@nestjs/common';

import type {
  HttpNext,
  HttpRequestLike,
  HttpResponseLike,
} from './http-types';

const logger = new Logger('HTTP');

/**
 * Logs every request the process receives, whatever answers it: the API, the
 * static assets, the liveness routes or nothing at all (404).
 *
 * It is the difference between "no traffic reaches the container" and "traffic
 * arrives but on an unexpected path", which otherwise look the same in the
 * platform logs. Behind a proxy the peer address is the proxy, so the
 * forwarded headers are logged as well.
 *
 * A request that never gets an answer (a hung database call, a probe that timed
 * out) is logged when the connection closes, marked as aborted: otherwise the
 * most interesting case would leave no line at all.
 */
export function accessLog(
  request: HttpRequestLike,
  response: HttpResponseLike,
  next: HttpNext,
): void {
  const startedAt = Date.now();
  let logged = false;

  const write = (aborted: boolean): void => {
    if (logged) {
      return;
    }
    logged = true;
    logger.log(
      [
        `${request.method} ${request.originalUrl} → ${response.statusCode.toString(10)}`,
        `${(Date.now() - startedAt).toString(10)}ms`,
        aborted ? 'aborted' : 'completed',
        `ip=${request.ip ?? '-'}`,
        `forwarded=${headerValue(request.headers['x-forwarded-for']) ?? '-'}`,
        `proto=${headerValue(request.headers['x-forwarded-proto']) ?? '-'}`,
        `host=${headerValue(request.headers['host']) ?? '-'}`,
        `ua=${headerValue(request.headers['user-agent']) ?? '-'}`,
      ].join(' '),
    );
  };

  response.once('finish', () => {
    write(false);
  });
  response.once('close', () => {
    write(!response.writableFinished);
  });

  next();
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.join(',');
  }
  return value;
}
