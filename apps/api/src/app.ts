import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorHandler, notFound } from './http/errors/error-handler.js';
import { requestId } from './http/middleware/request-id.js';
import { healthRouter } from './http/routes/health.routes.js';
import { requestLogger } from './infrastructure/logging/logger.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestId);
  app.use(requestLogger);
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, origin === undefined || env.FRONTEND_ORIGINS.includes(origin));
      },
      credentials: true,
      exposedHeaders: ['X-Request-Id'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/v1', healthRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
