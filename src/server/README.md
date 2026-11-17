# Backend organization

The backend runs inside the root Next.js application. HTTP entry points belong in
`src/app/api`; executable backend code belongs here and imports `server-only`.
Route Handlers translate HTTP input/output and delegate to backend functions.
Server Components may call backend functions directly instead of fetching the
application's own HTTP endpoints.

Only application liveness is implemented. `GET /api/v1/health` returns
`{ "data": { "status": "ok" } }` with a request ID and no-store caching.
It does not check database or external-service readiness.

## Adding a feature

Create `src/server/modules/<feature>/` when implementing the feature. Keep its
service, validation schemas, DTO mapping, repository, and Mongoose models together
as they become necessary. Add shared infrastructure only when used. Do not create
empty modules, placeholder endpoints, or database models ahead of implementation.

The approved documents define these future areas:

| Area | Future modules / collections |
| --- | --- |
| Identity | auth, users; users, refreshSessions, oneTimeTokens |
| Wedding and team | weddings, wedding-memberships, wedding-team; weddings, weddingMemberships, teamInvitations |
| Planning | events, tasks; events, tasks |
| Guests | guests, guest-families; guests, guestFamilies |
| Spending | expenses, vendors; expenses, vendors |
| Guest website | wedding-website; weddingWebsites |
| Invitations | invitations, rsvp; invitations, guestAccessTokens, rsvps |
| Celebration | livestream, photos; livestreams, photoAlbums, photos |
| Integrations | email, uploads; emailDeliveries and provider adapters |

Use `/api/v1` for member APIs and `/api/v1/public` for guest APIs. Authenticate
and validate wedding membership before wedding-scoped queries; enforce the
last-Admin rule in services. Guest access uses scoped capability tokens, not user
accounts. Follow the database contract for integer paise, UTC dates, token hashes,
and photo moderation. Keep provider credentials and database access server-only.

MongoDB/Mongoose, authentication, S3/CloudFront, SES/SQS, Google Places, forms, and
client fetching libraries are deferred until a feature uses them. Their contracts
remain in the four approved files under `docs/`.
