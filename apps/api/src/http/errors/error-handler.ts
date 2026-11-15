import type { ErrorRequestHandler, RequestHandler } from 'express';

import { logger } from '../../infrastructure/logging/logger.js';

export const notFound: RequestHandler = (request, response) => {
  response.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found.', requestId: request.id },
  });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    [400, 413, 415].includes(error.status)
      ? error.status
      : 500;

  if (status === 500) {
    logger.error(
      { requestId: request.id, errorType: error instanceof Error ? error.name : 'UnknownError' },
      'Request failed',
    );
  }

  const errors: Record<number, { code: string; message: string }> = {
    400: { code: 'BAD_REQUEST', message: 'Malformed request.' },
    413: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' },
    415: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Unsupported request encoding.' },
    500: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
  };

  response.status(status).json({
    error: { ...errors[status], requestId: request.id },
  });
};
