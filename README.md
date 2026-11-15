# Make My Marriage

A collaborative wedding-management application for couples and their wedding managers, with account-free guest experiences. This repository currently contains the **Phase 0 scaffold only**.

## Structure

```text
apps/web            Next.js + TypeScript + App Router
apps/api            Express + TypeScript modular monolith
packages/contracts  Browser-safe shared API contracts; intentionally empty API surface
docs                Approved product, architecture, database, and API documents
.github/workflows   Validation workflow; no deployment
```

Future feature directories are created only when needed. The contracts package has no domain schemas or runtime dependencies yet; neither app imports it yet.

## Approved architecture

One Git repository, REST APIs, a modular-monolith backend, and separate frontend/backend deployments. The planned stack includes MongoDB Atlas/Mongoose, custom JWT authentication, AWS SES/SQS, and private S3/CloudFront media. The frontend will deploy to Vercel and the backend to AWS. Database, authentication, integrations, and deployment are outside this scaffold.

Source of truth:

- [Product requirements](docs/PRD.md)
- [System architecture](docs/SYSTEM_ARCHITECTURE.md)
- [Database design](docs/DATABASE_DESIGN.md)
- [API design](docs/API_DESIGN.md)

These documents must not be reformatted by tooling. The requested Phase 0 health route is `/api/v1/health`; the documents' operational `/health` and `/ready` routes remain a later deployment concern.

## Prerequisites

- Node.js **24.22.3 LTS**, pinned in `.nvmrc`.
- npm **11.19.1**, pinned in the root `packageManager`.
- Git.

Use your Node version manager to select the pinned version. Dependencies are installed from the repository root and recorded in one lockfile. TypeScript 5.9 is selected to remain within the ESLint TypeScript parser's supported range.

## Install and run

```sh
npm install
npm run dev
```

Local defaults allow both apps to start without creating environment files. Local development uses the supported Next.js Webpack mode after Turbopack development compilation timed out on this Windows workspace. Production builds retain the default Next.js bundler.

| Service                         | URL                                 |
| ------------------------------- | ----------------------------------- |
| Frontend                        | http://localhost:3000               |
| Backend health                  | http://localhost:5000/api/v1/health |
| Health through frontend rewrite | http://localhost:3000/api/v1/health |

The backend root has no product route and returns a JSON 404. Press Ctrl+C to stop development processes.

## Local environment

To override defaults, copy:

- `apps/web/.env.example` to `apps/web/.env.local`.
- `apps/api/.env.example` to `apps/api/.env`.

Do not commit real environment files. No MongoDB, JWT, AWS, or Google configuration is needed.

The frontend's `API_UPSTREAM_URL` is server-only and defaults to `http://localhost:5000`. Its rewrite preserves `/api/v1/*`. Restart Next.js after changing the upstream.

The API validates configuration with Zod. `FRONTEND_ORIGINS` is a comma-separated exact-origin allow-list. `APP_ENV` is local/staging/production; `NODE_ENV` keeps standard Node values. Staging and production will receive isolated configuration through their hosting environments.

## Commands

| Command                                   | Purpose                                               |
| ----------------------------------------- | ----------------------------------------------------- |
| `npm run dev`                             | Run web and API together                              |
| `npm run dev:web`                         | Run only Next.js                                      |
| `npm run dev:api`                         | Run only the API with restart-on-change               |
| `npm run build`                           | Build contracts, API, then web                        |
| `npm run build:contracts`                 | Emit browser-safe ESM and declarations                |
| `npm run build:api`                       | Compile API into `apps/api/dist`                      |
| `npm run build:web`                       | Build Next.js                                         |
| `npm run typecheck`                       | Generate Next.js route types and check all workspaces |
| `npm run lint` / `npm run lint:fix`       | Check / fix lint issues                               |
| `npm run format` / `npm run format:check` | Format / check formatting, excluding approved docs    |
| `npm run check`                           | Format check, lint, typecheck, and build              |

After building, start the API with `npm run start --workspace=@mmm/api` and web with `npm run start --workspace=@mmm/web`. Production API execution uses compiled JavaScript.

## Validation and next phases

CI runs `npm ci`, formatting, linting, type checking, and builds. There are no placeholder test scripts or deployment jobs.

The API includes only environment configuration, structured logs, generated request IDs, error envelopes, security headers, exact-origin CORS, JSON parsing, and health. Raw URLs, headers, and bodies are omitted from HTTP logs.

Next work requires explicit approval: database connection, authentication/session security, and then wedding membership and application modules. No database schemas, authentication, cloud integration, or product features are implemented.
