# Project instructions

- Use one Next.js App Router application at the repository root, with TypeScript and source in src/.
- Keep the scaffold small and add feature modules only when requested.
- Keep HTTP entry points in src/app/api and backend implementation in src/server. Mark executable backend modules with import 'server-only'.
- Create collection-backed modules under src/server/modules/<feature> only when implementing that feature; do not create empty modules or database models in advance.
- Preserve the four approved docs/ files. Their original separate-backend layout is historical context; the user's latest single-application direction takes precedence.
- Read README.md for setup and run npm run check after implementation changes.
- Keep secrets in ignored environment files and server-only code.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
