# Make My Marriage

A collaborative Indian wedding management application. This repository contains a
fresh, minimal Next.js App Router foundation with TypeScript and source in `src/`.

## Setup

Use Node.js 24 LTS (recommended) and npm. The lint toolchain supports Node.js
20.19+, 22.13+, and 24+. Node.js 23 is outside its supported engine ranges.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. No database, cloud account, or environment variables
are required for the scaffold. Copy `.env.example` to `.env.local` when a feature
needs configuration. Never commit real credentials or expose secrets through
`NEXT_PUBLIC_` variables.

## Structure

```text
make-my-marriage/
  docs/                          Four approved design documents, unchanged
  public/
    favicon.svg                  Static application icon
  src/
    app/
      api/v1/health/route.ts     Thin HTTP liveness handler
      globals.css                Tailwind CSS import and global styles
      layout.tsx                 Root layout and application metadata
      page.tsx                   Welcome page
    server/
      health.ts                  Server-only liveness implementation
      README.md                  Backend boundaries and future feature map
  .env.example                   Configuration guidance without secrets
  .gitignore                     Generated files and secrets excluded
  AGENTS.md                      Project and installed Next.js instructions
  eslint.config.mjs              Next.js Core Web Vitals and TypeScript rules
  next.config.ts                 Next.js configuration
  postcss.config.mjs             Tailwind CSS PostCSS plugin
  package.json                   One application and one set of npm scripts
  package-lock.json              Reproducible npm dependency resolution
  tsconfig.json                  Strict TypeScript and @/* source alias
```

Next.js generates `next-env.d.ts` and `.next/`; TypeScript generates its build
cache. These files and `node_modules/` are ignored by Git.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start development with the default Turbopack bundler |
| `npm run build` | Build for production |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint with zero warnings allowed |
| `npm run lint:fix` | Apply automatic ESLint fixes |
| `npm run typecheck` | Generate route types and run TypeScript |
| `npm run check` | Run lint, type checking, and a production build |

Run `npm run check` after implementation changes. If Turbopack has problems in a
local environment, Next.js supports `npm run dev -- --webpack` and
`npm run build -- --webpack`.

## Architecture and scope

There is one root Next.js application and one application server. Pages and
Route Handlers live in `src/app`; backend implementation lives in `src/server`.
The same-origin API needs no separate Express application or API proxy.
Executable backend modules import `server-only`.

Implemented: a welcome page, root layout, static icon, and
`GET /api/v1/health`, returning `{ "data": { "status": "ok" } }` with an
`X-Request-Id` header. The health route checks application liveness only.

Add collection-backed feature modules under `src/server/modules/<feature>` as
features are built. See [backend organization](src/server/README.md) for the
planned domain map and implementation rules. Authentication, database models,
wedding features, cloud integrations, and deployment are not implemented yet.

## Design documents

- [Product requirements](docs/PRD.md)
- [System architecture](docs/SYSTEM_ARCHITECTURE.md)
- [Database design](docs/DATABASE_DESIGN.md)
- [API design](docs/API_DESIGN.md)

These four approved files are preserved unchanged. Their separate Express backend,
Vercel/AWS split, and cross-origin configuration describe the historical design.
The current single-application direction takes precedence: implement the domain,
security, API, and database contracts within Next.js Route Handlers and server-only
modules as each feature is requested.

## Next.js references

This foundation follows the official [manual installation](https://nextjs.org/docs/app/getting-started/installation#manual-installation),
[project structure](https://nextjs.org/docs/app/getting-started/project-structure),
and [Route Handler](https://nextjs.org/docs/app/getting-started/route-handlers)
guides. It uses Tailwind CSS and the `@/*` source alias. Installed-version guides are
available in `node_modules/next/dist/docs/`.

## Dependency notes

The documented Next.js ESLint configuration currently depends on ESLint 9 through
its React plugin peer dependencies. npm reports that ESLint 9 is out of support.
The installed lint dependency chain also has 14 high audit findings stemming from
the unpatched [picomatch advisory GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf).
These findings are in development dependencies; the runtime-only installation
reported no vulnerabilities. No forced downgrade or incompatible override has been
applied. Use `npm audit` to inspect the current dependency report.

## Styling

Tailwind CSS is installed using the official
[Next.js integration](https://tailwindcss.com/docs/installation/framework-guides/nextjs):

```sh
npm install --save-dev --save-exact tailwindcss@latest @tailwindcss/postcss@latest postcss@latest
```

`postcss.config.mjs` enables `@tailwindcss/postcss`, and `src/app/globals.css`
imports Tailwind. Use utility classes in components; the welcome page uses the
`flex` utility. Existing global styles provide the application's initial look.
Tailwind scans source files automatically, so no JavaScript Tailwind configuration
or manual content globs are needed for this setup.
