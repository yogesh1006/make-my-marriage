# Make My Marriage — System Design Architecture

**Release:** MVP / V1  
**Status:** Approved architecture baseline  
**Architecture style:** Modular monolith  
**Frontend:** Next.js + TypeScript + App Router  
**Backend:** Node.js + Express + TypeScript  
**Database:** MongoDB Atlas + Mongoose

---

## 1. Executive Summary

Make My Marriage V1 uses a **modular-monolith architecture** with a separately deployed frontend and backend.

- **Frontend:** Next.js + TypeScript + App Router, hosted on Vercel.
- **Backend:** Node.js + Express + TypeScript, deployed as one modular monolith on AWS.
- **Database:** MongoDB Atlas with Mongoose.
- **Media:** private Amazon S3 storage with CloudFront delivery.
- **Email:** AWS SES, with AWS SQS for durable/bulk invitation processing.
- **Maps/vendor discovery:** Google Maps / Places APIs.
- **Livestream:** external YouTube URL/embed; Make My Marriage does not stream video itself.
- **Authentication:** custom JWT with short-lived access tokens, rotating refresh sessions, HttpOnly cookies, email verification, and server-side session records.
- **Guest access:** no guest accounts; public workflows use strong random opaque capability tokens.

The architecture is deliberately simple enough for an MVP while preserving clean domain boundaries, secure tenant isolation, and paths for future scaling.

## 2. Architecture Goals

The V1 architecture should:

1. Support the complete PRD without premature microservices.
2. Keep deployment and operational complexity manageable.
3. Support one user participating in multiple weddings.
4. Provide strong wedding-level tenant isolation.
5. Keep Admin/Manager authorization simple and server-enforced.
6. Support no-login guest flows securely.
7. Support potentially media-heavy wedding galleries without routing image bytes through the Express server.
8. Support reliable invitation/reminder emails without keeping HTTP requests open for large batches.
9. Preserve clear module boundaries so selected capabilities can be extracted later if scale requires it.
10. Make local, staging, and production environments possible from the beginning.

## 3. High-Level Architecture

```text
                             Browser
                                │
                                ▼
                    ┌──────────────────────┐
                    │        Vercel        │
                    │ Next.js + TypeScript │
                    │ App Router           │
                    └──────────┬───────────┘
                               │ HTTPS / REST
                               ▼
                    ┌──────────────────────┐
                    │         AWS          │
                    │ Node.js + Express    │
                    │ TypeScript           │
                    │ Modular Monolith     │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼────────────────────┐
             │                 │                    │
             ▼                 ▼                    ▼
       MongoDB Atlas       Amazon S3             AWS SQS
             │                 │                    │
             │                 ▼                    ▼
             │            CloudFront            Email Worker
             │                                      │
             │                                      ▼
             │                                    AWS SES
             │
             ├──────── Google Maps / Places
             └──────── YouTube
```

## 4. Architectural Style — Modular Monolith

The backend is **one deployable application**, but code is organized around business domains rather than one large shared controllers/services folder.

Suggested logical modules:

```text
auth
users
weddings
wedding-memberships
wedding-team
events
tasks
guests
guest-families
invitations
rsvp
expenses
vendors
wedding-website
livestream
photos
email
uploads
```

Each module should own its relevant:

- routes
- controllers/handlers
- service/business logic
- validation schemas
- Mongoose model access
- authorization checks specific to the domain
- DTO mapping

Shared infrastructure should contain only truly cross-cutting concerns such as configuration, logging, database connection, authentication middleware, error handling, request IDs, rate limiting, S3, SES/SQS, and common utilities.

## 5. Frontend Architecture

### 5.1 Technology

- Next.js
- TypeScript
- App Router
- React
- React Hook Form
- Zod
- TanStack Query for client-side server-state fetching/caching where needed
- Next/Image for gallery/display optimization where appropriate

### 5.2 Hosting

Frontend is hosted on **Vercel**.

### 5.3 Frontend responsibilities

The frontend handles:

- authenticated application UI
- Admin/Manager navigation differences
- public wedding website
- public invitation/RSVP flows
- guest photo-upload interface
- optimistic/user-friendly loading and error states
- form validation for UX
- REST calls to the Express API

The frontend must never be treated as the authority for authorization. Backend permission checks are mandatory.

### 5.4 State strategy

Avoid placing server data into global Redux by default. Most application state is server state:

- events
- tasks
- guests
- invitations
- RSVP
- expenses
- vendors
- website configuration
- livestreams
- photos

Use server rendering where beneficial, TanStack Query for interactive client fetching/caching, and local React state for UI-only state.

## 6. Backend Architecture

### 6.1 Technology

- Node.js
- Express.js
- TypeScript
- REST APIs
- Mongoose
- Zod
- Pino logging

### 6.2 Hosting recommendation

For V1, use **AWS Elastic Beanstalk** for the Express backend to avoid introducing ECS/Fargate-level infrastructure complexity too early.

The backend can later move to container-based infrastructure if scale or operational needs justify it.

### 6.3 Backend responsibilities

The backend owns:

- authentication/session lifecycle
- authorization
- wedding tenant isolation
- business rules
- database access
- guest capability-token resolution
- email job creation
- S3 presigned-upload authorization
- photo metadata/moderation state
- vendor discovery integration
- livestream validation/storage
- API validation/error contracts

## 7. API Architecture

REST is used for V1.

Representative internal routes:

```text
/api/v1/auth
/api/v1/users
/api/v1/weddings
/api/v1/weddings/:weddingId/events
/api/v1/weddings/:weddingId/tasks
/api/v1/weddings/:weddingId/guests
/api/v1/weddings/:weddingId/expenses
/api/v1/weddings/:weddingId/vendors
```

Representative public routes:

```text
/api/v1/public/weddings/:slug
/api/v1/public/invitations/:token
/api/v1/public/rsvp/:token
/api/v1/public/photo-upload/:token
```

Authenticated management APIs and public guest APIs should remain visibly separated.

## 8. MongoDB Atlas Architecture

### 8.1 Database

MongoDB Atlas with Mongoose.

Recommended production region: **AWS Mumbai / `ap-south-1`** to keep the initial India-focused application close to its primary users and AWS services.

### 8.2 Collection strategy

Do not embed all wedding data inside one `Wedding` document.

Use focused collections such as:

- users
- refreshSessions
- oneTimeTokens
- weddings
- weddingMemberships
- teamInvitations
- events
- tasks
- guestFamilies
- guests
- invitations
- guestAccessTokens
- rsvps
- expenses
- vendors
- weddingWebsites
- livestreams
- photoAlbums
- photos
- emailDeliveries

### 8.3 Tenant boundary

Nearly every wedding-owned record contains:

```text
weddingId
```

Every authenticated wedding operation must:

1. authenticate the user;
2. resolve active `WeddingMembership` for the requested wedding;
3. enforce any role-specific requirement;
4. run database operations scoped to the same `weddingId`.

## 9. Multi-Wedding Model

One user can participate in multiple weddings with different roles.

```text
User
 ├── Wedding A → ADMIN
 └── Wedding B → MANAGER
```

`WeddingMembership` is the bridge:

```text
User
  │
  ▼
WeddingMembership
  │ role = ADMIN | MANAGER
  ▼
Wedding
```

Roles do not live globally on `User`.

## 10. Authorization Model

Authenticated roles:

- `ADMIN`
- `MANAGER`

`MANAGER` has operational access to wedding features but cannot manage membership/roles.

`ADMIN` additionally can:

- invite/remove Managers
- promote Manager → Admin
- demote Admin → Manager

### 10.1 Last-Admin safeguard

A wedding must always retain at least one Admin. Removing/demoting the final Admin is rejected.

Where concurrent role changes could violate this rule, use an atomic/transactional service-layer operation.

## 11. Authentication Architecture

### 11.1 Custom JWT model

Use:

- access token: approximately **15 minutes**
- refresh session: configurable **7–30 days**
- refresh-token rotation
- HttpOnly cookies
- Secure cookies outside local development
- appropriate SameSite behavior

Do **not** use localStorage for long-lived authentication secrets.

### 11.2 Refresh sessions

Maintain server-side refresh-session records to support:

- logout/revocation
- refresh rotation
- password-reset revocation
- future “logout all devices”
- refresh-token reuse detection

Conceptual fields:

```text
userId
refreshTokenHash / token identifier
expiresAt
revokedAt
replacedBy
userAgent
createdAt
```

### 11.3 Password hashing

Use **Argon2id** as the preferred password-hashing algorithm. Bcrypt is an acceptable fallback if deployment/runtime constraints require it.

Never store plaintext passwords.

## 12. Email Verification and One-Time Tokens

Email verification is mandatory for account creation.

```text
Register
  ↓
Create unverified account
  ↓
Generate cryptographically random token
  ↓
Store token hash + expiry
  ↓
Send link using SES
  ↓
User opens link
  ↓
Validate hash / expiry / purpose
  ↓
Mark email verified
```

Do not reuse the normal login JWT as an email-verification token.

Use the same hashed opaque-token pattern for:

- email verification
- password reset
- Manager invitations

with distinct token purposes and expiry rules.

## 13. Cookie / Cross-Origin Strategy

The frontend is on Vercel and the backend is on AWS. Before a custom shared domain exists, avoid relying on fragile third-party-cookie behavior.

For staging/production, prefer a **same-origin proxy/rewrite pattern** from the Next.js/Vercel frontend to the API where practical, so browser cookies can remain first-party from the user's perspective.

When a custom domain is introduced later, a preferred topology is:

```text
app.example.com   → Vercel
api.example.com   → Express/AWS
media.example.com → CloudFront
```

Cookie domain/SameSite/CORS/CSRF settings should then be configured deliberately for that topology.

## 14. CSRF and Browser Security

Because authenticated state is carried in cookies, state-changing requests require CSRF protection.

The API design should use a CSRF strategy compatible with the chosen same-origin/cookie deployment model, such as a synchronizer/double-submit token pattern.

Additional controls:

- HTTPS outside local development
- secure headers
- input validation
- output encoding
- restricted CORS
- HttpOnly authentication cookies
- no secrets in client-side code

## 15. Guest Access Architecture

Guests do not have accounts.

Guest workflows use **strong random opaque tokens**, not predictable IDs and not guest JWT accounts.

Raw tokens should be sent in links, while only token hashes are stored in MongoDB.

### 15.1 Separate capabilities

Do not use one universal guest token for everything.

Examples:

- invitation/RSVP capability token
- photo-upload capability token

An RSVP token should not automatically grant photo-management capabilities, and a photo-upload token must not allow RSVP changes.

### 15.2 Household invitations

One invitation can represent a `GuestFamily`/household and allow event-level RSVP for the relevant family members.

## 16. Public Wedding Website

V1 behavior:

- accessible by URL
- **public-by-link**
- marked **noindex**

The public website exposes only intended guest-facing data, not the internal planning workspace.

## 17. Email Architecture

AWS SES is the transactional email provider.

Email use cases:

- account verification
- password reset
- Manager invitation
- wedding invitation
- manual RSVP reminder

### 17.1 Bulk email flow

Large invitation sends must not block one HTTP request while sending every email.

```text
Admin clicks Send Invitations
           ↓
Express validates + creates records/jobs
           ↓
Publish jobs to SQS
           ↓
Return API response
           ↓
Worker consumes SQS
           ↓
Send through SES with controlled throughput
```

This preserves the modular monolith: the worker can live in the same codebase even though it runs as a separate process/runtime responsibility.

### 17.2 Email delivery state

Track at least:

- `QUEUED`
- `SENT`
- `FAILED`
- `BOUNCED`
- `COMPLAINED`

Handle bounce/complaint feedback so sender reputation is protected.

### 17.3 Deliverability

Production domain setup should eventually include:

- SPF
- DKIM
- DMARC
- SES production access / sending-limit configuration

## 18. Media Storage Architecture

### 18.1 Storage

Use private **Amazon S3** for original images.

MongoDB stores only metadata; never store image binaries in MongoDB.

### 18.2 Direct upload flow

Do not proxy large wedding photos through Express.

```text
Browser
  │ request upload authorization
  ▼
Express
  │ presigned S3 URL
  ▼
Browser
  │ direct upload
  ▼
S3
  │
  └── metadata confirmation → Express → MongoDB
```

### 18.3 S3 security

- Bucket remains private.
- Presigned URLs are short-lived and restricted to validated object keys/content constraints where possible.
- Backend authorizes every upload before issuing a URL.
- Backend verifies completion/object metadata before finalizing the Photo record where appropriate.

## 19. CDN and Image Delivery

Use:

```text
S3 → CloudFront → Users
```

CloudFront uses **Origin Access Control (OAC)** to access the private S3 origin.

CloudFront is responsible for caching/distribution, not by itself for image resizing.

For V1:

- S3 stores full-resolution originals.
- CloudFront serves media.
- Next/Image handles suitable display optimization.

Future versions may pre-generate thumbnail/medium/large variants if gallery traffic warrants it.

## 20. Photo Rules

Supported V1 formats:

- JPEG
- PNG
- WebP

Recommended configurable limits:

- maximum single image: **15 MB**
- maximum one upload batch: **20 images**

Original files are retained.

Guest-upload moderation states:

```text
PENDING
APPROVED
REJECTED
```

Admin/Manager uploads can be approved immediately; guest uploads start as `PENDING`.

## 21. Expense / Currency Conventions

V1 currency is **INR**.

Store the wedding currency explicitly (`INR`) rather than hard-coding currency assumptions throughout business logic.

Store monetary values as integer minor units (paise), not floating-point numbers.

Example:

```text
₹1,500.00 → 150000 paise
```

## 22. Time and Timezone

Store machine timestamps in UTC.

Each wedding stores a timezone. V1 default:

```text
Asia/Kolkata
```

Convert to the wedding timezone for display and wedding-local scheduling rules.

## 23. Language

V1 is English only. Multilingual invitations/websites remain future work.

## 24. Soft Delete / Account Safeguards

Wedding deletion uses soft deletion (for example `deletedAt`) rather than immediate physical destruction.

If a user is the last Admin of an active wedding, account deletion must be blocked until the user:

- promotes another Manager to Admin; or
- explicitly deletes the wedding according to the product workflow.

## 25. Nearby Vendor Discovery

Use Google Maps / Places APIs.

```text
User searches nearby vendor category
          ↓
Google Places API
          ↓
Display third-party results
          ↓
User chooses Add to My Vendors
          ↓
Create internal Vendor record
```

Do not persist arbitrary third-party search results as internal vendors unless the user chooses them.

## 26. Livestream Architecture

Make My Marriage does not stream video.

```text
Admin/Manager configures YouTube URL
             ↓
Livestream record in MongoDB
             ↓
Wedding website
             ↓
YouTube embed / Watch Live link
```

## 27. QR Architecture

QR codes simply encode secure guest-facing URLs, such as:

- wedding website URL
- RSVP/invitation capability URL
- guest photo-upload capability URL

No dedicated external QR backend is required for V1.

## 28. Logging

Use **Pino** for structured backend logging.

Recommended log fields:

- timestamp
- log level
- requestId
- method
- route
- status code
- duration
- error category/message

Never log:

- passwords
- access tokens
- refresh tokens
- guest raw capability tokens
- sensitive cookie contents

Generate a request ID for each API request so logs can be correlated.

## 29. Rate Limiting

Apply rate limiting particularly to:

- signup/login
- password reset
- resend email verification
- public invitation resolution
- RSVP submission
- guest upload authorization
- other anonymous/public state-changing endpoints

The first implementation can use lightweight Express middleware; advanced distributed rate limiting can be deferred until scale requires it.

## 30. Validation and Error Handling

Use Zod for backend request validation. Frontend validation improves UX but does not replace backend validation.

Recommended request flow:

```text
Request
  ↓
Request ID / logging
  ↓
Rate limit where applicable
  ↓
Authentication
  ↓
CSRF (for cookie-auth state changes)
  ↓
Zod validation
  ↓
Wedding membership / authorization
  ↓
Service/business logic
  ↓
Mongoose / external integration
  ↓
Standard response/error mapping
```

Do not expose raw stack traces/internal infrastructure errors to clients.

## 31. Environment Strategy

Design for:

### Local

- Next.js on a local port (for example 3000)
- Express on a local port (for example 5000)
- developer environment variables
- development/staging-grade cloud resources as appropriate

### Staging

Used for:

- integration testing
- SES/S3/CloudFront validation
- guest-flow testing
- deployment verification
- demos/review

### Production

Real users and production data.

Staging and production should not share MongoDB databases, S3 prefixes/buckets, secrets, SES operational configuration, or other critical state where separation is practical.

## 32. Secret / Configuration Management

Environment-specific configuration includes:

- MongoDB connection URI
- JWT signing secrets/keys
- cookie settings
- AWS credentials/roles
- S3 bucket/CloudFront configuration
- SES/SQS configuration
- Google API keys
- frontend/backend origins
- CSRF/security values

Do not commit secrets to source control.

## 33. Failure Handling

### Database failures

- fail requests safely
- return standardized service errors
- log internal detail with request ID

### S3 upload failures

- do not create/finalize public gallery records until upload completion is verified
- allow retry

### Email failures

- durable SQS jobs and delivery state
- retry transient failures
- surface permanent failure state

### External Places API failures

- degrade vendor discovery without breaking the main wedding workspace

### YouTube URL issues

- validate URL shape/provider where practical
- provide clear guest-facing fallback if embedding fails

## 34. Scalability Strategy

V1 deliberately avoids premature distributed architecture.

Scale first by:

- appropriate MongoDB indexes
- pagination
- direct S3 uploads
- CloudFront caching
- queue-based email
- stateless API instances except for external/shared state
- horizontal backend scaling when needed

Potential future extraction candidates if traffic requires them:

- media processing
- asynchronous communication/notifications
- search
- AI workloads

Do not split these into services until there is a measurable reason.

## 35. Key Sequence Flows

### 35.1 Authenticated wedding request

```text
Browser
  ↓ access cookie
Express
  ↓ verify token
Resolve WeddingMembership
  ↓
Check role/business rule
  ↓
Query by weddingId
  ↓
Response
```

### 35.2 Token refresh

```text
Expired/near-expiry access session
  ↓
Refresh request with HttpOnly refresh cookie
  ↓
Validate refresh session/hash
  ↓
Revoke/rotate old token
  ↓
Create replacement refresh session/token
  ↓
Issue new access token + refresh cookie
```

### 35.3 Guest RSVP

```text
Guest opens invitation token URL
  ↓
Backend hashes raw token and resolves capability
  ↓
Load household / invited events
  ↓
Guest submits event responses
  ↓
Validate capability + invitation membership
  ↓
Upsert guest+event RSVP records
```

### 35.4 Guest photo upload

```text
Guest opens photo-upload capability
  ↓
Request presigned upload
  ↓
Backend validates token + file metadata
  ↓
Browser uploads directly to S3
  ↓
Confirm metadata
  ↓
Create Photo status=PENDING
  ↓
Admin/Manager moderation
```

### 35.5 Bulk wedding invitations

```text
Admin chooses recipients
  ↓
API validates wedding + recipient set
  ↓
Create invitation/email-delivery records
  ↓
Enqueue SQS jobs
  ↓
Worker sends via SES
  ↓
Update delivery status / provider events
```

## 36. Testing Strategy

### Unit tests

Prioritize service/business rules such as:

- last-Admin protection
- role authorization
- token lifecycle
- expense calculations
- RSVP constraints
- media validation

### Integration tests

Cover:

- Express + MongoDB behavior
- authenticated tenant isolation
- role checks
- public capability-token flows
- transaction-sensitive role changes

### Contract/API tests

Verify:

- status codes
- validation errors
- response envelopes
- auth/cookie/CSRF behavior

### End-to-end tests

Critical journeys:

- signup → verification → login → create wedding
- invite Manager → accept → collaborate
- guest invitation → RSVP
- guest photo upload → moderation → public gallery

External AWS/Google integrations should use controlled test/staging configuration and mocks where appropriate.

## 37. Deployment / Release Strategy

### Frontend

Next.js deployed to Vercel.

### Backend

Express deployed to AWS Elastic Beanstalk for V1.

### Managed services

- MongoDB Atlas
- S3
- CloudFront
- SES
- SQS

### Release flow

```text
Local development
      ↓
Automated tests / build checks
      ↓
Staging deployment
      ↓
Integration / E2E validation
      ↓
Production deployment
```

A custom domain is not required for initial development, but production cookie/security topology should be revisited when a shared domain is selected.

## 38. Implementation Mapping to PRD Phases

### Phase 1 — Foundation & Authentication

- frontend/backend projects
- MongoDB connection
- auth module
- verification/reset tokens
- refresh sessions
- cookie/CSRF security

### Phase 2 — Wedding & Team

- weddings
- WeddingMembership
- Team invitations
- Admin/Manager authorization
- last-Admin transaction safeguards

### Phase 3 — Events & Dashboard

- events
- event indexes
- dashboard aggregates

### Phase 4 — Tasks

- task module
- assignee membership validation
- event/task query indexes

### Phase 5 — Guests & Families

- guest/household collections
- event invitations
- search/filter indexes

### Phase 6 — Expenses & Vendors

- integer-paise expenses
- vendor references
- lightweight My Vendors

### Phase 7 — Wedding Website & Themes

- public slug route
- noindex behavior
- shared theme/content model

### Phase 8 — Invitations & RSVP

- capability tokens
- RSVP uniqueness constraints
- SES/SQS pipeline
- reminder email commands

### Phase 9 — Livestream & QR

- YouTube metadata
- secure guest URLs
- QR generation

### Phase 10 — Photo Gallery

- S3 presigned uploads
- CloudFront
- photo metadata/moderation
- public guest upload tokens

### Phase 11 — Vendor Discovery

- Google Places integration
- explicit Add to My Vendors mapping

## 39. Deferred Architecture Decisions

Future versions may introduce, only when justified:

- Redis-based distributed caching/rate limiting
- ECS/Fargate/Kubernetes
- dedicated media transformation pipeline
- full-text/search service
- WhatsApp/SMS communication providers
- AI/RAG services
- face-recognition/photo intelligence
- vendor marketplace services
- mobile-specific backend concerns
- professional planner multi-tenant SaaS extensions

## 40. Final Architecture Decision Summary

| Area | V1 Decision |
|---|---|
| Architecture | Modular monolith |
| Frontend | Next.js + TypeScript + App Router |
| Frontend hosting | Vercel |
| Backend | Node.js + Express + TypeScript |
| Backend hosting | AWS Elastic Beanstalk recommended |
| API | REST over HTTPS |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Auth | Custom JWT |
| Access token | ~15 minutes |
| Refresh session | 7–30 days, rotating |
| Token storage | HttpOnly Secure cookies |
| Password hashing | Argon2id recommended |
| Validation | Zod |
| Email verification | Required |
| Email provider | AWS SES |
| Bulk email | SES + SQS |
| RSVP reminders | Included in V1 |
| Email feedback | Bounce/complaint handling |
| Images | AWS S3 |
| Upload strategy | Direct presigned S3 uploads |
| CDN | CloudFront with private S3 origin |
| Gallery optimization | Next/Image initially |
| Formats | JPEG / PNG / WebP |
| Max photo | 15 MB recommended |
| Batch | 20 images recommended |
| Originals retained | Yes |
| Guest access | Hashed opaque random capability tokens |
| Website exposure | Public-by-link + noindex |
| Multi-wedding | Yes |
| Roles | Admin + Manager |
| Currency | INR |
| Timezone | Asia/Kolkata default |
| Language | English |
| Wedding deletion | Soft delete |
| Vendors | Google Places / Maps |
| Livestream | YouTube |
| Logging | Pino + request IDs |
| Environments | Local / Staging / Production |
| Custom domain | Deferred |

## 41. Architecture Principle

> **Keep the system simple to build, but deliberately design today's shortcuts so they do not become tomorrow's blockers.**

Managed infrastructure is used where it solves a real problem: Atlas for data, S3/CloudFront for media, SES/SQS for reliable invitations, Vercel for Next.js, and one Express modular monolith for business logic.
