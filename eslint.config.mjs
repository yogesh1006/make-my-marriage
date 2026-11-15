import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextPlugin from '@next/eslint-plugin-next';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/coverage/**',
    '**/next-env.d.ts',
    '.tools/**',
    'docs/**',
  ]),
  {
    files: ['**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      nextPlugin.configs['core-web-vitals'],
    ],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    settings: { next: { rootDir: 'apps/web/' } },
  },
  {
    files: ['apps/api/**/*.ts', 'packages/contracts/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/api/**/*.ts', 'packages/contracts/**/*.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@mmm/api', '@mmm/api/*', '**/apps/api/**', '**/api/src/**'],
              message: 'Use browser-safe contracts instead of backend code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@mmm/web', '@mmm/web/*', '**/apps/web/**', '**/web/src/**'],
              message: 'The API must not import frontend code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/contracts/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-globals': ['error', 'process', 'Buffer', 'window', 'document'],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'node:*',
                '@mmm/api',
                '@mmm/api/*',
                '@mmm/web',
                '@mmm/web/*',
                '**/apps/**',
                'mongoose',
                'express',
                '@aws-sdk/*',
              ],
              message: 'Contracts must remain browser-safe and independent of applications.',
            },
          ],
        },
      ],
    },
  },
  prettier,
]);
