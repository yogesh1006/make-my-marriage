import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';
import { z } from 'zod';

// Resolve from this workspace in both src/config and compiled dist/config.
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const httpOrigin = z
  .string()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
    } catch {
      return false;
    }
  }, 'Expected an HTTP(S) origin without a path.');

const environmentSchema = z.object({
  APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  FRONTEND_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .pipe(z.array(httpOrigin).min(1)),
  PUBLIC_WEB_URL: httpOrigin.default('http://localhost:3000'),
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
  throw new Error(`Invalid environment configuration for: ${fields.join(', ')}`);
}

export const env = result.data;
