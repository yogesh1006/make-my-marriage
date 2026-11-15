import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './infrastructure/logging/logger.js';

const server = createApp().listen(env.PORT, () => {
  logger.info({ port: env.PORT, environment: env.APP_ENV }, 'API listening');
});

server.on('error', (error) => {
  logger.fatal({ errorType: error.name, message: error.message }, 'API startup failed');
  process.exitCode = 1;
});

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'API shutting down');

  const timeout = setTimeout(() => {
    logger.error('API shutdown timed out');
    server.closeAllConnections();
    process.exitCode = 1;
  }, 10_000);
  timeout.unref();

  server.close((error) => {
    clearTimeout(timeout);
    if (error) {
      logger.error({ errorType: error.name }, 'API shutdown failed');
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
