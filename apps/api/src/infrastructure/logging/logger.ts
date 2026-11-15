import type { IncomingMessage, ServerResponse } from 'node:http';

import { pino } from 'pino';
import { pinoHttp } from 'pino-http';

import { env } from '../../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'password',
      'token',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
    ],
    remove: true,
  },
});

export const requestLogger = pinoHttp({
  logger,
  genReqId: (request) => request.id,
  wrapSerializers: false,
  // Do not log raw URLs, query strings, bodies, or headers. Future URL tokens are secrets.
  serializers: {
    req: (request: IncomingMessage) => ({ id: request.id, method: request.method }),
    res: (response: ServerResponse) => ({ statusCode: response.statusCode }),
    err: (error: unknown) => ({ type: error instanceof Error ? error.name : 'UnknownError' }),
  },
});
