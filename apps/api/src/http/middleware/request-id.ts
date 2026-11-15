import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

export const requestId: RequestHandler = (request, response, next) => {
  // Generate our own ID rather than trusting arbitrary incoming headers.
  request.id = randomUUID();
  response.setHeader('X-Request-Id', request.id);
  next();
};
