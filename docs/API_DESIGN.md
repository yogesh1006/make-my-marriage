**Make My Marriage**

**API Design Document**

**MVP V1**

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Purpose</strong></p>
<p>Implementation-ready REST API contract for the approved Make My Marriage modular-monolith architecture. It translates the PRD, system architecture, and MongoDB database design into browser-facing, guest-facing, and integration API boundaries.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **Document**   | **Value**                                                  |
|----------------|------------------------------------------------------------|
| Version        | 1.0                                                        |
| Status         | Implementation baseline                                    |
| Date           | 14 November 2026                                           |
| Frontend       | Next.js + TypeScript + App Router                          |
| Backend        | Node.js + Express + TypeScript                             |
| Database       | MongoDB Atlas + Mongoose                                   |
| API style      | REST over HTTPS                                            |
| Authentication | Custom JWT in HttpOnly cookies + rotating refresh sessions |

*Companion documents: Product Requirements • System Design Architecture • Database Design*

# Contents

1\. Executive Summary

2\. API Design Goals and Scope

3\. Architecture Context

4\. API Surfaces, Base URLs, and Environments

5\. Authentication, Cookies, and CSRF

6\. Request and Response Conventions

7\. Error Contract and HTTP Status Codes

8\. Pagination, Filtering, Sorting, and Search

9\. Authorization and Tenant Isolation

10\. Public Capability-Token Model

11\. Endpoint Catalog

12\. Authentication APIs

13\. User/Profile APIs

14\. Wedding and Dashboard APIs

15\. Wedding Team APIs

16\. Event and Task APIs

17\. Guest Family and Guest APIs

18\. Invitation and Email APIs

19\. RSVP APIs

20\. Expense APIs

21\. Vendor and Discovery APIs

22\. Wedding Website and Livestream APIs

23\. Photo Album, Photo, and Upload APIs

24\. Public Guest APIs

25\. Email Queue and SES Event Processing

26\. Resource DTO Contracts

27\. Validation and Business Rules

28\. Idempotency, Transactions, and Concurrency

29\. Rate Limiting and Abuse Protection

30\. Security Requirements

31\. Performance, Caching, and Payload Design

32\. Logging and Request Tracing

33\. API Versioning and OpenAPI Strategy

34\. Testing Strategy

35\. Implementation Order

36\. Final API Decision Summary

# 1. Executive Summary

This document defines the REST API contract for Make My Marriage MVP V1. The API is served by one Node.js + Express + TypeScript modular-monolith backend and consumed by the Next.js frontend. MongoDB Atlas/Mongoose is the system of record; AWS S3/CloudFront handles media; AWS SES/SQS handles email delivery; Google Places/Maps and YouTube remain external integrations.

The API deliberately exposes two security surfaces: authenticated wedding-management APIs for Admins and Managers, and public capability-link APIs for guests. Guests never receive application accounts. Public operations are authorized with high-entropy opaque tokens rather than MongoDB identifiers or login JWTs.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Core contract</strong></p>
<p>Every wedding-scoped authenticated request validates an ACTIVE WeddingMembership before data access. ADMIN is required only for Wedding Team management; MANAGER retains operational access to all other V1 modules.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 2. API Design Goals and Scope

- Keep the API resource-oriented, predictable, and easy to consume from Next.js while using explicit action endpoints for workflows that are not simple CRUD.

- Preserve weddingId as the tenant boundary on every operational request and never trust a client-provided weddingId without membership verification.

- Keep guest access account-free through purpose-limited opaque tokens.

- Use consistent DTOs, validation rules, error shapes, pagination, and status codes across modules.

- Keep binary photo traffic out of Express by using presigned direct-to-S3 uploads.

- Keep bulk email out of synchronous HTTP request processing by queueing work to SQS/SES.

- Do not expose database-only fields such as passwordHash, tokenHash, S3 bucket names, internal deletion metadata, or refresh-session internals.

- Design for local, staging, and production without requiring a custom domain during initial development.

This document does not define frontend component design, detailed Mongoose model code, AWS provisioning scripts, or the final OpenAPI YAML file. Those artifacts are implementation follow-ons to this contract.

# 3. Architecture Context

Browser / Next.js (Vercel)  
\|  
\| HTTPS REST (prefer same-origin Vercel rewrite/proxy)  
v  
Node.js + Express + TypeScript modular monolith  
\|  
+--\> MongoDB Atlas / Mongoose  
+--\> AWS S3 (presigned uploads) --\> CloudFront  
+--\> AWS SQS --\> SES email worker  
+--\> Google Places / Maps  
+--\> YouTube metadata/embed

The browser should preferably call the Next.js origin under a rewrite such as /backend-api/\* or /api/\* that forwards to the AWS Express backend. This keeps authentication cookies first-party before a custom application domain exists. Direct cross-origin development calls remain supported through an exact CORS allow-list with credentials enabled.

# 4. API Surfaces, Base URLs, and Environments

| **Surface**         | **Recommended prefix** | **Audience**                     | **Authentication**                   |
|---------------------|------------------------|----------------------------------|--------------------------------------|
| Authenticated API   | /api/v1                | Admin / Manager                  | Access JWT cookie + CSRF             |
| Public guest API    | /api/v1/public         | Guests / public wedding visitors | Opaque guest token or published slug |
| Integration webhook | /webhooks              | AWS services                     | Provider signature verification      |
| Operations          | /health, /ready        | Infrastructure                   | Network/environment controlled       |

Environment examples are configuration, not hard-coded API behavior:

| **Environment** | **Frontend**                                    | **Backend target**     |
|-----------------|-------------------------------------------------|------------------------|
| Local           | http://localhost:3000                           | http://localhost:5000  |
| Staging         | Vercel staging/preview origin                   | AWS staging backend    |
| Production      | Vercel production origin / future custom domain | AWS production backend |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>No custom domain yet</strong></p>
<p>The API contract must not depend on app.makemymarriage.com or api.makemymarriage.com existing today. Those hostnames remain a future production refinement.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 5. Authentication, Cookies, and CSRF

## 5.1 Token model

| **Credential**        | **Lifetime**                          | **Storage**                                  | **Purpose**                              |
|-----------------------|---------------------------------------|----------------------------------------------|------------------------------------------|
| Access JWT            | 15 minutes                            | HttpOnly cookie                              | Authenticated API authorization          |
| Refresh token/session | Default 7 days; configurable up to 30 | HttpOnly cookie + hashed server-side session | Issue rotated access/refresh credentials |
| CSRF token            | Session-scoped/rotatable              | Readable same-site cookie + request header   | Reject cross-site state changes          |

Recommended cookie names are implementation conventions, not public domain semantics: mmm_access, mmm_refresh, and mmm_csrf. In production, authentication cookies are Secure and HttpOnly; refresh is scoped as narrowly as practical to authentication routes. SameSite=Lax is the baseline when using a same-origin proxy.

## 5.2 CSRF contract

All browser-originated POST, PUT, PATCH, and DELETE requests that rely on authentication cookies should include X-CSRF-Token matching the server-issued CSRF value. The backend also validates the Origin/Referer against the configured frontend allow-list. Public capability-token endpoints do not rely on authentication cookies and therefore use token authorization + rate limiting instead.

GET /api/v1/auth/csrf  
\<- Set-Cookie: mmm_csrf=\<random\>; SameSite=Lax  
\<- { "data": { "csrfToken": "\<same value\>" } }  
  
POST /api/v1/weddings  
Cookie: mmm_access=...  
X-CSRF-Token: \<value\>

## 5.3 Authentication state transitions

Register -\> unverified User -\> verify email -\> Login  
Login -\> Access JWT + ACTIVE RefreshSession  
Refresh -\> old session ROTATED -\> new ACTIVE session -\> new cookies  
Reuse rotated refresh token -\> revoke ACTIVE sessions in same family  
Logout -\> revoke current refresh session + clear cookies  
Password reset -\> consume one-time token; optionally revoke all refresh sessions

# 6. Request and Response Conventions

- JSON request/response bodies use application/json; photo bytes never pass through normal API JSON requests.

- All timestamps are ISO-8601 UTC strings in the API. The UI formats them using Wedding.timezone (Asia/Kolkata default).

- Mongo ObjectIds are serialized as strings named id, weddingId, eventId, guestId, etc.; raw \_id is not exposed in API DTOs.

- Money is represented as integer paise using fields such as totalAmountPaise and amountPaidPaise.

- PATCH performs partial updates. Omitted fields are unchanged; explicit null is only accepted for nullable fields.

- DELETE usually means domain delete/soft delete where history must be preserved. Success returns 204 No Content unless the caller needs an updated resource.

- Enum values are uppercase snake case in API payloads to match backend domain constants.

- Unknown request fields should be rejected or stripped consistently by Zod; strict request DTOs are preferred.

## 6.1 Success envelope

{  
"data": { ... },  
"meta": { ... optional pagination/aggregation metadata ... }  
}

## 6.2 List envelope

{  
"data": \[ ... \],  
"meta": {  
"nextCursor": "...",  
"hasMore": true  
}  
}

# 7. Error Contract and HTTP Status Codes

{  
"error": {  
"code": "VALIDATION_ERROR",  
"message": "Request validation failed.",  
"details": \[  
{ "field": "email", "message": "Invalid email address." }  
\],  
"requestId": "req_01..."  
}  
}

| **Status** | **Meaning**                                         | **Typical API codes**                                            |
|------------|-----------------------------------------------------|------------------------------------------------------------------|
| 400        | Malformed request / invalid syntax                  | BAD_REQUEST                                                      |
| 401        | No valid authentication / expired access token      | UNAUTHENTICATED, ACCESS_TOKEN_EXPIRED                            |
| 403        | Authenticated but not allowed                       | FORBIDDEN, ADMIN_REQUIRED                                        |
| 404        | Resource/public capability not resolvable           | NOT_FOUND, PUBLIC_LINK_INVALID                                   |
| 409        | State conflict or uniqueness conflict               | EMAIL_EXISTS, MEMBERSHIP_EXISTS, SLUG_TAKEN, LAST_ADMIN_REQUIRED |
| 410        | Optional only for explicitly retired internal flows | RESOURCE_GONE                                                    |
| 413        | Payload/file request too large                      | FILE_TOO_LARGE                                                   |
| 415        | Unsupported media type                              | UNSUPPORTED_MEDIA_TYPE                                           |
| 422        | Semantically invalid body/query                     | VALIDATION_ERROR, BUSINESS_RULE_VIOLATION                        |
| 429        | Rate limit exceeded                                 | RATE_LIMITED                                                     |
| 500        | Unexpected server failure                           | INTERNAL_ERROR                                                   |
| 502/503    | External dependency unavailable                     | EMAIL_PROVIDER_UNAVAILABLE, PLACES_UNAVAILABLE                   |

For opaque guest links, invalid, expired, or revoked tokens should normally return the same generic PUBLIC_LINK_INVALID response so callers cannot use error differences to enumerate link state.

# 8. Pagination, Filtering, Sorting, and Search

Cursor pagination is preferred for potentially large datasets such as guests, invitations, photos, and email delivery history. Simple bounded lists such as wedding team members or events may return all active records without pagination until scale requires otherwise.

| **Parameter**                                      | **Contract**                                                                     |
|----------------------------------------------------|----------------------------------------------------------------------------------|
| limit                                              | Default 20; maximum 100 unless an endpoint documents a smaller maximum.          |
| cursor                                             | Opaque server cursor. Clients must not parse or construct it.                    |
| q                                                  | Case-insensitive search term; maximum recommended length 100.                    |
| sort                                               | Whitelisted field; prefix - for descending, e.g. -createdAt.                     |
| status / eventId / assigneeMembershipId / familyId | Endpoint-specific filters.                                                       |
| includeDeleted                                     | Not exposed to normal V1 clients unless a recovery workflow is explicitly added. |

Photo lists should use createdAt + id cursor ordering rather than high skip/limit offsets. Dashboard endpoints return aggregate data and are not paginated.

# 9. Authorization and Tenant Isolation

Authenticated request  
-\> validate access JWT  
-\> normalize/validate weddingId  
-\> load ACTIVE WeddingMembership { weddingId, userId }  
-\> if missing: 403 FORBIDDEN  
-\> if Admin-only route and role != ADMIN: 403 ADMIN_REQUIRED  
-\> execute query with weddingId included in filter  
-\> never fetch child entity only by child id

| **Route family**                              | **ADMIN** | **MANAGER** |
|-----------------------------------------------|-----------|-------------|
| Wedding Team membership/invites/role changes  | Allowed   | Denied      |
| Wedding details/dashboard/events/tasks/guests | Allowed   | Allowed     |
| Invitations/RSVP/expenses/vendors             | Allowed   | Allowed     |
| Website/themes/livestream/photos/moderation   | Allowed   | Allowed     |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Tenant-safety rule</strong></p>
<p>Never execute findById(childId) and authorize afterward. Query by { _id: childId, weddingId } after membership has been validated so cross-wedding identifiers cannot be used to retrieve data.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 10. Public Capability-Token Model

| **Purpose**     | **Token target**                | **Allowed capability**                                                |
|-----------------|---------------------------------|-----------------------------------------------------------------------|
| INVITATION_RSVP | Invitation / household snapshot | Read invitation context and submit RSVP for allowed guest-event pairs |
| PHOTO_UPLOAD    | Wedding                         | Read limited upload context and upload guest photos only              |

Raw guest tokens are high-entropy random bearer secrets. MongoDB stores only SHA-256 token hashes. Multiple active invitation tokens may point to the same Invitation so a reminder can issue a fresh link without breaking an earlier email. A token purpose never implicitly grants another capability.

# 11. Endpoint Catalog

| **Method** | **Path**                                                              | **Auth**                       | **Purpose**                                     |
|------------|-----------------------------------------------------------------------|--------------------------------|-------------------------------------------------|
| GET        | /api/v1/auth/csrf                                                     | Public                         | Issue/refresh CSRF token                        |
| POST       | /api/v1/auth/register                                                 | Public                         | Create unverified account                       |
| POST       | /api/v1/auth/email-verification/confirm                               | Public                         | Verify email with one-time token                |
| POST       | /api/v1/auth/email-verification/resend                                | Public                         | Resend verification email                       |
| POST       | /api/v1/auth/login                                                    | Public                         | Authenticate and create refresh session         |
| POST       | /api/v1/auth/refresh                                                  | Refresh cookie                 | Rotate refresh session and renew access         |
| POST       | /api/v1/auth/logout                                                   | Authenticated                  | Revoke current session and clear cookies        |
| POST       | /api/v1/auth/logout-all                                               | Authenticated                  | Revoke all user refresh sessions                |
| POST       | /api/v1/auth/forgot-password                                          | Public                         | Queue password-reset email                      |
| POST       | /api/v1/auth/reset-password                                           | Public                         | Consume reset token and set new password        |
| GET        | /api/v1/users/me                                                      | Authenticated                  | Get current profile                             |
| PATCH      | /api/v1/users/me                                                      | Authenticated                  | Update profile                                  |
| PATCH      | /api/v1/users/me/password                                             | Authenticated                  | Change password                                 |
| DELETE     | /api/v1/users/me                                                      | Authenticated                  | Delete account subject to last-Admin rules      |
| GET        | /api/v1/weddings                                                      | Authenticated                  | List user weddings and roles                    |
| POST       | /api/v1/weddings                                                      | Authenticated + verified email | Create wedding + first Admin membership         |
| GET        | /api/v1/weddings/{weddingId}                                          | Member                         | Get wedding                                     |
| PATCH      | /api/v1/weddings/{weddingId}                                          | Member                         | Update wedding profile                          |
| DELETE     | /api/v1/weddings/{weddingId}                                          | ADMIN                          | Soft-delete wedding                             |
| GET        | /api/v1/weddings/{weddingId}/dashboard                                | Member                         | Get dashboard aggregates                        |
| GET        | /api/v1/weddings/{weddingId}/team                                     | ADMIN                          | List active team members                        |
| GET        | /api/v1/weddings/{weddingId}/team/invitations                         | ADMIN                          | List pending/recent Manager invitations         |
| POST       | /api/v1/weddings/{weddingId}/team/invitations                         | ADMIN                          | Invite Manager by email                         |
| DELETE     | /api/v1/weddings/{weddingId}/team/invitations/{invitationId}          | ADMIN                          | Revoke pending Manager invitation               |
| POST       | /api/v1/team-invitations/{token}/accept                               | Authenticated                  | Accept Manager invitation                       |
| PATCH      | /api/v1/weddings/{weddingId}/team/members/{membershipId}/role         | ADMIN                          | Promote/demote member                           |
| DELETE     | /api/v1/weddings/{weddingId}/team/members/{membershipId}              | ADMIN                          | Remove team member                              |
| GET        | /api/v1/weddings/{weddingId}/events                                   | Member                         | List events                                     |
| POST       | /api/v1/weddings/{weddingId}/events                                   | Member                         | Create event                                    |
| GET        | /api/v1/weddings/{weddingId}/events/{eventId}                         | Member                         | Get event                                       |
| PATCH      | /api/v1/weddings/{weddingId}/events/{eventId}                         | Member                         | Update event                                    |
| DELETE     | /api/v1/weddings/{weddingId}/events/{eventId}                         | Member                         | Delete/soft-delete event                        |
| GET        | /api/v1/weddings/{weddingId}/tasks                                    | Member                         | List/filter tasks                               |
| POST       | /api/v1/weddings/{weddingId}/tasks                                    | Member                         | Create task                                     |
| GET        | /api/v1/weddings/{weddingId}/tasks/{taskId}                           | Member                         | Get task                                        |
| PATCH      | /api/v1/weddings/{weddingId}/tasks/{taskId}                           | Member                         | Update task/status/assignment                   |
| DELETE     | /api/v1/weddings/{weddingId}/tasks/{taskId}                           | Member                         | Delete task                                     |
| GET        | /api/v1/weddings/{weddingId}/guest-families                           | Member                         | List households                                 |
| POST       | /api/v1/weddings/{weddingId}/guest-families                           | Member                         | Create household                                |
| GET        | /api/v1/weddings/{weddingId}/guest-families/{familyId}                | Member                         | Get household + members                         |
| PATCH      | /api/v1/weddings/{weddingId}/guest-families/{familyId}                | Member                         | Update household                                |
| DELETE     | /api/v1/weddings/{weddingId}/guest-families/{familyId}                | Member                         | Delete/soft-delete household                    |
| GET        | /api/v1/weddings/{weddingId}/guests                                   | Member                         | List/search/filter guests                       |
| POST       | /api/v1/weddings/{weddingId}/guests                                   | Member                         | Create guest                                    |
| GET        | /api/v1/weddings/{weddingId}/guests/{guestId}                         | Member                         | Get guest                                       |
| PATCH      | /api/v1/weddings/{weddingId}/guests/{guestId}                         | Member                         | Update guest/event invitations                  |
| DELETE     | /api/v1/weddings/{weddingId}/guests/{guestId}                         | Member                         | Delete/soft-delete guest                        |
| GET        | /api/v1/weddings/{weddingId}/invitations                              | Member                         | List invitation records/status                  |
| POST       | /api/v1/weddings/{weddingId}/invitations                              | Member                         | Create one household/individual invitation      |
| POST       | /api/v1/weddings/{weddingId}/invitations/bulk                         | Member                         | Create multiple invitation records              |
| GET        | /api/v1/weddings/{weddingId}/invitations/{invitationId}               | Member                         | Get invitation                                  |
| POST       | /api/v1/weddings/{weddingId}/invitations/{invitationId}/access-links  | Member                         | Issue fresh public RSVP link                    |
| POST       | /api/v1/weddings/{weddingId}/invitations/{invitationId}/send-email    | Member                         | Queue invitation email                          |
| POST       | /api/v1/weddings/{weddingId}/invitations/{invitationId}/send-reminder | Member                         | Queue one RSVP reminder                         |
| POST       | /api/v1/weddings/{weddingId}/invitations/reminders                    | Member                         | Queue reminders for filtered pending recipients |
| DELETE     | /api/v1/weddings/{weddingId}/invitations/{invitationId}               | Member                         | Revoke invitation and active public tokens      |
| GET        | /api/v1/weddings/{weddingId}/rsvps                                    | Member                         | List/filter RSVP responses                      |
| PUT        | /api/v1/weddings/{weddingId}/rsvps/{guestId}/{eventId}                | Member                         | Create/override one RSVP                        |
| DELETE     | /api/v1/weddings/{weddingId}/rsvps/{guestId}/{eventId}                | Member                         | Reset RSVP to pending                           |
| GET        | /api/v1/weddings/{weddingId}/expenses                                 | Member                         | List/filter expenses                            |
| POST       | /api/v1/weddings/{weddingId}/expenses                                 | Member                         | Create expense                                  |
| GET        | /api/v1/weddings/{weddingId}/expenses/{expenseId}                     | Member                         | Get expense                                     |
| PATCH      | /api/v1/weddings/{weddingId}/expenses/{expenseId}                     | Member                         | Update expense/payment fields                   |
| DELETE     | /api/v1/weddings/{weddingId}/expenses/{expenseId}                     | Member                         | Delete expense                                  |
| GET        | /api/v1/weddings/{weddingId}/vendors                                  | Member                         | List vendors                                    |
| POST       | /api/v1/weddings/{weddingId}/vendors                                  | Member                         | Create manual vendor                            |
| GET        | /api/v1/weddings/{weddingId}/vendors/{vendorId}                       | Member                         | Get vendor                                      |
| PATCH      | /api/v1/weddings/{weddingId}/vendors/{vendorId}                       | Member                         | Update vendor                                   |
| DELETE     | /api/v1/weddings/{weddingId}/vendors/{vendorId}                       | Member                         | Delete vendor                                   |
| GET        | /api/v1/weddings/{weddingId}/vendor-discovery/search                  | Member                         | Proxy Google Places search                      |
| POST       | /api/v1/weddings/{weddingId}/vendors/from-discovery                   | Member                         | Save selected Google place as vendor            |
| GET        | /api/v1/weddings/{weddingId}/website                                  | Member                         | Get website configuration                       |
| PUT        | /api/v1/weddings/{weddingId}/website                                  | Member                         | Create/replace website configuration            |
| PATCH      | /api/v1/weddings/{weddingId}/website                                  | Member                         | Update website/theme/content                    |
| POST       | /api/v1/weddings/{weddingId}/website/publish                          | Member                         | Publish website                                 |
| POST       | /api/v1/weddings/{weddingId}/website/unpublish                        | Member                         | Unpublish website                               |
| GET        | /api/v1/wedding-websites/slug-availability                            | Authenticated                  | Check proposed slug availability                |
| GET        | /api/v1/weddings/{weddingId}/livestreams                              | Member                         | List livestreams                                |
| POST       | /api/v1/weddings/{weddingId}/livestreams                              | Member                         | Create YouTube livestream config                |
| GET        | /api/v1/weddings/{weddingId}/livestreams/{livestreamId}               | Member                         | Get livestream                                  |
| PATCH      | /api/v1/weddings/{weddingId}/livestreams/{livestreamId}               | Member                         | Update livestream                               |
| DELETE     | /api/v1/weddings/{weddingId}/livestreams/{livestreamId}               | Member                         | Delete livestream                               |
| GET        | /api/v1/weddings/{weddingId}/photo-albums                             | Member                         | List albums                                     |
| POST       | /api/v1/weddings/{weddingId}/photo-albums                             | Member                         | Create album                                    |
| GET        | /api/v1/weddings/{weddingId}/photo-albums/{albumId}                   | Member                         | Get album                                       |
| PATCH      | /api/v1/weddings/{weddingId}/photo-albums/{albumId}                   | Member                         | Update album                                    |
| DELETE     | /api/v1/weddings/{weddingId}/photo-albums/{albumId}                   | Member                         | Delete album with safe reassignment rule        |
| GET        | /api/v1/weddings/{weddingId}/photos                                   | Member                         | List/filter gallery photos                      |
| POST       | /api/v1/weddings/{weddingId}/photos/uploads/presign                   | Member                         | Create presigned S3 upload URLs                 |
| POST       | /api/v1/weddings/{weddingId}/photos/uploads/complete                  | Member                         | Validate S3 objects + create Photo metadata     |
| GET        | /api/v1/weddings/{weddingId}/photos/{photoId}/download-url            | Member                         | Issue short-lived original download URL         |
| DELETE     | /api/v1/weddings/{weddingId}/photos/{photoId}                         | Member                         | Delete photo                                    |
| GET        | /api/v1/weddings/{weddingId}/photos/moderation                        | Member                         | List pending guest uploads                      |
| PATCH      | /api/v1/weddings/{weddingId}/photos/{photoId}/moderation              | Member                         | Approve/reject guest photo                      |
| POST       | /api/v1/weddings/{weddingId}/photo-upload-links                       | Member                         | Issue guest photo-upload capability link        |
| GET        | /api/v1/weddings/{weddingId}/photo-upload-links                       | Member                         | List issued capability metadata                 |
| DELETE     | /api/v1/weddings/{weddingId}/photo-upload-links/{tokenId}             | Member                         | Revoke guest photo-upload capability            |
| GET        | /api/v1/public/weddings/{slug}                                        | Public                         | Read published wedding website data             |
| GET        | /api/v1/public/weddings/{slug}/events                                 | Public                         | Read guest-facing events                        |
| GET        | /api/v1/public/weddings/{slug}/gallery/albums                         | Public                         | Read public albums                              |
| GET        | /api/v1/public/weddings/{slug}/gallery/photos                         | Public                         | Read approved photos only                       |
| GET        | /api/v1/public/weddings/{slug}/livestreams                            | Public                         | Read guest-facing livestreams                   |
| GET        | /api/v1/public/invitations/{token}                                    | Guest token                    | Read household invitation + current RSVP        |
| PUT        | /api/v1/public/invitations/{token}/rsvps                              | Guest token                    | Upsert household event RSVP responses           |
| GET        | /api/v1/public/photo-uploads/{token}                                  | Guest token                    | Read limited upload context                     |
| POST       | /api/v1/public/photo-uploads/{token}/presign                          | Guest token                    | Create guest presigned upload URLs              |
| POST       | /api/v1/public/photo-uploads/{token}/complete                         | Guest token                    | Create PENDING guest Photo metadata             |
| POST       | /webhooks/aws/ses                                                     | AWS SNS signature              | Process SES bounce/complaint/delivery events    |
| GET        | /health                                                               | None                           | Liveness check                                  |
| GET        | /ready                                                                | None/network-restricted        | Dependency readiness check                      |

# 12. Authentication APIs

**GET /api/v1/auth/csrf** *— Issue a CSRF token*

| **Property**     | **Contract**                                                                           |
|------------------|----------------------------------------------------------------------------------------|
| Authentication   | Public                                                                                 |
| CSRF             | No                                                                                     |
| Request body     | None                                                                                   |
| Query / path     | None                                                                                   |
| Success          | 200 OK + csrf token; sets CSRF cookie                                                  |
| Rules            | Generate cryptographically random value. This endpoint does not authenticate the user. |
| Important errors | 429 on abusive refreshes.                                                              |

**POST /api/v1/auth/register** *— Create an unverified user account*

| **Property**     | **Contract**                                                                                                                                          |
|------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Public                                                                                                                                                |
| CSRF             | Yes                                                                                                                                                   |
| Request body     | { name, email, password }                                                                                                                             |
| Query / path     | None                                                                                                                                                  |
| Success          | 201 Created                                                                                                                                           |
| Rules            | Normalize email; Argon2id hash; reject duplicate email; create EMAIL_VERIFICATION one-time token; queue SES verification email. Do not log raw token. |
| Important errors | 409 EMAIL_EXISTS; 422 weak password/invalid email; 503 email queue unavailable after account creation must be handled explicitly.                     |

{  
"name": "Yogesh Kasliwal",  
"email": "yogesh@example.com",  
"password": "\<user-entered password\>"  
}

**POST /api/v1/auth/email-verification/confirm** *— Verify account email*

| **Property**     | **Contract**                                                                                                                               |
|------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Public                                                                                                                                     |
| CSRF             | Yes                                                                                                                                        |
| Request body     | { token }                                                                                                                                  |
| Query / path     | None                                                                                                                                       |
| Success          | 200 OK                                                                                                                                     |
| Rules            | Hash supplied token, find unused non-expired EMAIL_VERIFICATION record, set emailVerifiedAt, mark token used in transaction-like sequence. |
| Important errors | 404/422 EMAIL_VERIFICATION_INVALID.                                                                                                        |

**POST /api/v1/auth/email-verification/resend** *— Issue a new verification email*

| **Property**     | **Contract**                                                                                                                                       |
|------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Public                                                                                                                                             |
| CSRF             | Yes                                                                                                                                                |
| Request body     | { email }                                                                                                                                          |
| Query / path     | None                                                                                                                                               |
| Success          | 202 Accepted                                                                                                                                       |
| Rules            | Return generic success regardless of account existence; revoke older usable verification tokens before issuing a new one; rate limit per email/IP. |
| Important errors | 429 RATE_LIMITED.                                                                                                                                  |

**POST /api/v1/auth/login** *— Authenticate and create refresh session*

| **Property**     | **Contract**                                                                                               |
|------------------|------------------------------------------------------------------------------------------------------------|
| Authentication   | Public                                                                                                     |
| CSRF             | Yes                                                                                                        |
| Request body     | { email, password }                                                                                        |
| Query / path     | None                                                                                                       |
| Success          | 200 OK + Set-Cookie access/refresh                                                                         |
| Rules            | Require verified active account. Create refresh family/session, set HttpOnly cookies, return safe UserDTO. |
| Important errors | 401 INVALID_CREDENTIALS; 403 EMAIL_NOT_VERIFIED; 429 RATE_LIMITED.                                         |

**POST /api/v1/auth/refresh** *— Rotate refresh token/session*

| **Property**     | **Contract**                                                                                                                                                                |
|------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Refresh cookie                                                                                                                                                              |
| CSRF             | Yes                                                                                                                                                                         |
| Request body     | None                                                                                                                                                                        |
| Query / path     | None                                                                                                                                                                        |
| Success          | 200 OK + rotated cookies                                                                                                                                                    |
| Rules            | Hash refresh credential, require ACTIVE session, mark old ROTATED, create replacement in same family. Reuse of ROTATED credential revokes remaining ACTIVE family sessions. |
| Important errors | 401 REFRESH_INVALID; 401 REFRESH_REUSE_DETECTED.                                                                                                                            |

**POST /api/v1/auth/logout** *— Revoke current refresh session*

| **Property**     | **Contract**                                                                                           |
|------------------|--------------------------------------------------------------------------------------------------------|
| Authentication   | Authenticated or refresh cookie                                                                        |
| CSRF             | Yes                                                                                                    |
| Request body     | None                                                                                                   |
| Query / path     | None                                                                                                   |
| Success          | 204 No Content                                                                                         |
| Rules            | Revoke current refresh session if present and clear auth cookies. Endpoint is safe to call repeatedly. |
| Important errors | None beyond malformed CSRF/origin.                                                                     |

**POST /api/v1/auth/logout-all** *— Revoke all active sessions*

| **Property**     | **Contract**                                                                  |
|------------------|-------------------------------------------------------------------------------|
| Authentication   | Authenticated                                                                 |
| CSRF             | Yes                                                                           |
| Request body     | None                                                                          |
| Query / path     | None                                                                          |
| Success          | 204 No Content                                                                |
| Rules            | Revoke all ACTIVE refreshSessions for current user and clear current cookies. |
| Important errors | 401 UNAUTHENTICATED.                                                          |

**POST /api/v1/auth/forgot-password** *— Queue password reset email*

| **Property**     | **Contract**                                                                                                                  |
|------------------|-------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Public                                                                                                                        |
| CSRF             | Yes                                                                                                                           |
| Request body     | { email }                                                                                                                     |
| Query / path     | None                                                                                                                          |
| Success          | 202 Accepted                                                                                                                  |
| Rules            | Generic response; invalidate older usable PASSWORD_RESET tokens; create new token only for eligible account; queue SES email. |
| Important errors | 429 RATE_LIMITED.                                                                                                             |

**POST /api/v1/auth/reset-password** *— Reset password with one-time token*

| **Property**     | **Contract**                                                                                                         |
|------------------|----------------------------------------------------------------------------------------------------------------------|
| Authentication   | Public                                                                                                               |
| CSRF             | Yes                                                                                                                  |
| Request body     | { token, newPassword }                                                                                               |
| Query / path     | None                                                                                                                 |
| Success          | 200 OK                                                                                                               |
| Rules            | Consume one-time token; replace Argon2id hash; revoke active refresh sessions; never auto-login from reset endpoint. |
| Important errors | 404/422 RESET_TOKEN_INVALID; 422 weak password.                                                                      |

# 13. User/Profile APIs

**GET /api/v1/users/me** *— Get current safe profile*

| **Property**     | **Contract**                                                    |
|------------------|-----------------------------------------------------------------|
| Authentication   | Authenticated                                                   |
| CSRF             | No                                                              |
| Request body     | None                                                            |
| Query / path     | None                                                            |
| Success          | 200 OK UserDTO                                                  |
| Rules            | Never expose passwordHash, emailNormalized, token/session data. |
| Important errors | 401 UNAUTHENTICATED.                                            |

**PATCH /api/v1/users/me** *— Update display profile*

| **Property**     | **Contract**                                                                       |
|------------------|------------------------------------------------------------------------------------|
| Authentication   | Authenticated                                                                      |
| CSRF             | Yes                                                                                |
| Request body     | Partial { name }                                                                   |
| Query / path     | None                                                                               |
| Success          | 200 OK UserDTO                                                                     |
| Rules            | Email changes are out of V1 unless a re-verification workflow is explicitly added. |
| Important errors | 422 VALIDATION_ERROR.                                                              |

**PATCH /api/v1/users/me/password** *— Change password*

| **Property**     | **Contract**                                                                                                                                            |
|------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Authenticated                                                                                                                                           |
| CSRF             | Yes                                                                                                                                                     |
| Request body     | { currentPassword, newPassword }                                                                                                                        |
| Query / path     | None                                                                                                                                                    |
| Success          | 204 No Content                                                                                                                                          |
| Rules            | Verify current password; hash new password; revoke other refresh sessions and rotate/reauthenticate current session according to implementation policy. |
| Important errors | 401 CURRENT_PASSWORD_INVALID; 422 weak password.                                                                                                        |

**DELETE /api/v1/users/me** *— Delete account*

| **Property**     | **Contract**                                                                                                                           |
|------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Authenticated                                                                                                                          |
| CSRF             | Yes                                                                                                                                    |
| Request body     | None                                                                                                                                   |
| Query / path     | None                                                                                                                                   |
| Success          | 204 No Content                                                                                                                         |
| Rules            | Block if user is last ACTIVE ADMIN of any non-deleted wedding. Soft-delete user/account state as defined by database retention policy. |
| Important errors | 409 LAST_ADMIN_REQUIRED.                                                                                                               |

# 14. Wedding and Dashboard APIs

**GET /api/v1/weddings** *— List weddings the current user can access*

| **Property**     | **Contract**                                                                                    |
|------------------|-------------------------------------------------------------------------------------------------|
| Authentication   | Authenticated                                                                                   |
| CSRF             | No                                                                                              |
| Request body     | None                                                                                            |
| Query / path     | cursor/limit optional                                                                           |
| Success          | 200 OK                                                                                          |
| Rules            | Join ACTIVE WeddingMemberships to non-deleted Weddings; include membership role in each result. |
| Important errors | 401 only.                                                                                       |

**POST /api/v1/weddings** *— Create wedding and first Admin membership*

| **Property**     | **Contract**                                                                                                                       |
|------------------|------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Authenticated + verified email                                                                                                     |
| CSRF             | Yes                                                                                                                                |
| Request body     | WeddingCreateRequest                                                                                                               |
| Query / path     | None                                                                                                                               |
| Success          | 201 Created                                                                                                                        |
| Rules            | Create Wedding + ACTIVE ADMIN WeddingMembership in one MongoDB transaction. Currency defaults INR; timezone defaults Asia/Kolkata. |
| Important errors | 422 validation; 409 if transaction conflict.                                                                                       |

**PATCH /api/v1/weddings/{weddingId}** *— Update wedding profile*

| **Property**     | **Contract**                                                    |
|------------------|-----------------------------------------------------------------|
| Authentication   | Member                                                          |
| CSRF             | Yes                                                             |
| Request body     | Partial WeddingUpdateRequest                                    |
| Query / path     | weddingId                                                       |
| Success          | 200 OK                                                          |
| Rules            | No totalBudget field in V1. Validate dates/location/media refs. |
| Important errors | 403/404/422.                                                    |

**DELETE /api/v1/weddings/{weddingId}** *— Soft-delete wedding*

| **Property**     | **Contract**                                                                                                                |
|------------------|-----------------------------------------------------------------------------------------------------------------------------|
| Authentication   | ADMIN                                                                                                                       |
| CSRF             | Yes                                                                                                                         |
| Request body     | Optional { confirmationText }                                                                                               |
| Query / path     | weddingId                                                                                                                   |
| Success          | 204 No Content                                                                                                              |
| Rules            | Set deletedAt; all child APIs must treat parent-deleted wedding as inaccessible. Physical purge is separate retention work. |
| Important errors | 403 ADMIN_REQUIRED; 404.                                                                                                    |

**GET /api/v1/weddings/{weddingId}/dashboard** *— Return command-center aggregates*

| **Property**     | **Contract**                                                                                                              |
|------------------|---------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Member                                                                                                                    |
| CSRF             | No                                                                                                                        |
| Request body     | None                                                                                                                      |
| Query / path     | weddingId                                                                                                                 |
| Success          | 200 OK                                                                                                                    |
| Rules            | Aggregate events, guests, RSVP counts, tasks, expense totals, vendors, photo counts. Pending RSVP is derived, not stored. |
| Important errors | 403/404.                                                                                                                  |

{  
"data": {  
"daysRemaining": 87,  
"events": { "total": 6, "upcoming": 3 },  
"guests": { "total": 420 },  
"rsvp": { "attending": 312, "notAttending": 50, "pending": 58 },  
"tasks": { "total": 42, "pending": 8, "overdue": 3, "completed": 31 },  
"expenses": { "totalAmountPaise": 78500000, "amountPaidPaise": 51500000 },  
"vendors": { "total": 6 },  
"photos": { "approved": 240, "pendingModeration": 12 }  
}  
}

# 15. Wedding Team APIs

**POST /api/v1/weddings/{weddingId}/team/invitations** *— Invite a Manager*

| **Property**     | **Contract**                                                                                                                                               |
|------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | ADMIN                                                                                                                                                      |
| CSRF             | Yes                                                                                                                                                        |
| Request body     | { email }                                                                                                                                                  |
| Query / path     | weddingId                                                                                                                                                  |
| Success          | 201 Created                                                                                                                                                |
| Rules            | Reject active existing membership; revoke/replace duplicate PENDING invitation when appropriate; create hashed one-time token; queue MANAGER_INVITE email. |
| Important errors | 409 MEMBERSHIP_EXISTS / INVITE_ALREADY_PENDING; 422 invalid email.                                                                                         |

**POST /api/v1/team-invitations/{token}/accept** *— Accept a Manager invitation*

| **Property**     | **Contract**                                                                                                                    |
|------------------|---------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Authenticated + verified email                                                                                                  |
| CSRF             | Yes                                                                                                                             |
| Request body     | None                                                                                                                            |
| Query / path     | token                                                                                                                           |
| Success          | 200 OK MembershipDTO                                                                                                            |
| Rules            | Authenticated account email must match invited email; create/reactivate membership and mark invitation ACCEPTED in transaction. |
| Important errors | 403 INVITE_EMAIL_MISMATCH; 404 INVITE_INVALID; 409 MEMBERSHIP_EXISTS.                                                           |

**PATCH /api/v1/weddings/{weddingId}/team/members/{membershipId}/role** *— Promote/demote team member*

| **Property**     | **Contract**                                                        |
|------------------|---------------------------------------------------------------------|
| Authentication   | ADMIN                                                               |
| CSRF             | Yes                                                                 |
| Request body     | { role: ADMIN \| MANAGER }                                          |
| Query / path     | weddingId, membershipId                                             |
| Success          | 200 OK MembershipDTO                                                |
| Rules            | Transactionally prevent change that would leave zero ACTIVE Admins. |
| Important errors | 409 LAST_ADMIN_REQUIRED.                                            |

**DELETE /api/v1/weddings/{weddingId}/team/members/{membershipId}** *— Remove team member*

| **Property**     | **Contract**                                                                                                  |
|------------------|---------------------------------------------------------------------------------------------------------------|
| Authentication   | ADMIN                                                                                                         |
| CSRF             | Yes                                                                                                           |
| Request body     | None                                                                                                          |
| Query / path     | weddingId, membershipId                                                                                       |
| Success          | 204 No Content                                                                                                |
| Rules            | Mark membership REMOVED; transactionally enforce last-Admin safeguard. Historical task references may remain. |
| Important errors | 409 LAST_ADMIN_REQUIRED.                                                                                      |

# 16. Event and Task APIs

## 16.1 Event CRUD contract

| **Operation** | **Endpoint**                                  | **Key validation**                                                  |
|---------------|-----------------------------------------------|---------------------------------------------------------------------|
| List          | GET /weddings/{weddingId}/events              | Default chronological startAt order; exclude deleted.               |
| Create        | POST /weddings/{weddingId}/events             | name + startAt required; endAt \>= startAt.                         |
| Read          | GET /weddings/{weddingId}/events/{eventId}    | Filter by both id + weddingId.                                      |
| Update        | PATCH /weddings/{weddingId}/events/{eventId}  | Validate referenced media; date consistency.                        |
| Delete        | DELETE /weddings/{weddingId}/events/{eventId} | Soft delete when historical RSVP/photo/expense relationships exist. |

## 16.2 Task CRUD contract

| **Operation** | **Endpoint**                                | **Key validation**                                                                |
|---------------|---------------------------------------------|-----------------------------------------------------------------------------------|
| List          | GET /weddings/{weddingId}/tasks             | Filters: status, priority, eventId, assigneeMembershipId, dueFrom, dueTo, q.      |
| Create        | POST /weddings/{weddingId}/tasks            | Assignee must be ACTIVE membership of same wedding; event must belong to wedding. |
| Read          | GET /weddings/{weddingId}/tasks/{taskId}    | Return assignee summary for UI.                                                   |
| Update        | PATCH /weddings/{weddingId}/tasks/{taskId}  | Status/priority/assignment changes validated server-side.                         |
| Delete        | DELETE /weddings/{weddingId}/tasks/{taskId} | Hard/soft delete according to final implementation; no cross-wedding refs.        |

# 17. Guest Family and Guest APIs

## 17.1 Household contract

GuestFamily is a household grouping object; Guest.familyId is the membership source of truth. The API must not maintain a separate mutable members\[\] array that can drift from Guest records.

| **Operation** | **Endpoint**                                           | **Behavior**                                                                        |
|---------------|--------------------------------------------------------|-------------------------------------------------------------------------------------|
| List          | GET /weddings/{weddingId}/guest-families               | Search q; optional cursor pagination.                                               |
| Create        | POST /weddings/{weddingId}/guest-families              | Create { name, notes? }.                                                            |
| Read          | GET /weddings/{weddingId}/guest-families/{familyId}    | Return family + current member summaries.                                           |
| Update        | PATCH /weddings/{weddingId}/guest-families/{familyId}  | Update name/notes/primaryContactGuestId.                                            |
| Delete        | DELETE /weddings/{weddingId}/guest-families/{familyId} | Reject or detach/reassign members safely; soft-delete if invitation history exists. |

## 17.2 Guest contract

| **Operation** | **Endpoint**                                  | **Behavior**                                                                                 |
|---------------|-----------------------------------------------|----------------------------------------------------------------------------------------------|
| List          | GET /weddings/{weddingId}/guests              | Filters q, familyId, side, eventId; RSVP filtering may be implemented via aggregation.       |
| Create        | POST /weddings/{weddingId}/guests             | Email/phone optional; invitedEventIds must belong to wedding.                                |
| Read          | GET /weddings/{weddingId}/guests/{guestId}    | Return guest + household + invited event summaries.                                          |
| Update        | PATCH /weddings/{weddingId}/guests/{guestId}  | Changing family/event invitations must not silently rewrite historical Invitation snapshots. |
| Delete        | DELETE /weddings/{weddingId}/guests/{guestId} | Soft-delete when historical invitations/RSVPs exist.                                         |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>RSVP state</strong></p>
<p>GuestDTO does not persist one rsvpStatus field. API views may return computed RSVP summaries, but source-of-truth responses remain separate RSVP records per guest + event.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 18. Invitation and Email APIs

## 18.1 Create invitation

**POST /api/v1/weddings/{weddingId}/invitations** *— Create one invitation recipient snapshot*

| **Property**     | **Contract**                                                                                                                                                   |
|------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Member                                                                                                                                                         |
| CSRF             | Yes                                                                                                                                                            |
| Request body     | { guestFamilyId?, guestIds\[\] }                                                                                                                               |
| Query / path     | weddingId                                                                                                                                                      |
| Success          | 201 Created InvitationDTO                                                                                                                                      |
| Rules            | Every guest must belong to wedding; if family target is supplied, guestIds should represent intended household snapshot. No raw token is stored on Invitation. |
| Important errors | 422 invalid recipient set; 409 duplicate active invitation policy if enforced.                                                                                 |

## 18.2 Bulk create invitations

**POST /api/v1/weddings/{weddingId}/invitations/bulk** *— Create multiple invitation records*

| **Property**     | **Contract**                                                                                                                                                          |
|------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Member                                                                                                                                                                |
| CSRF             | Yes                                                                                                                                                                   |
| Request body     | { targets: \[{ guestFamilyId?, guestIds\[\] }\] }                                                                                                                     |
| Query / path     | weddingId                                                                                                                                                             |
| Success          | 201 Created                                                                                                                                                           |
| Rules            | Limit batch size (recommended 100 targets/request); validate all targets; use bulkWrite/transaction strategy to avoid partial duplicates according to product choice. |
| Important errors | 422 target validation; 409 duplicates.                                                                                                                                |

## 18.3 Issue shareable link

**POST /api/v1/weddings/{weddingId}/invitations/{invitationId}/access-links** *— Create a fresh RSVP capability link*

| **Property**     | **Contract**                                                                                                                   |
|------------------|--------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Member                                                                                                                         |
| CSRF             | Yes                                                                                                                            |
| Request body     | { expiresAt? }                                                                                                                 |
| Query / path     | weddingId, invitationId                                                                                                        |
| Success          | 201 Created { url, expiresAt }                                                                                                 |
| Rules            | Create GuestAccessToken purpose INVITATION_RSVP; return raw URL once; store only hash. Existing active links may remain valid. |
| Important errors | 404 invitation; 422 expiry.                                                                                                    |

## 18.4 Send invitation / reminder email

**POST /api/v1/weddings/{weddingId}/invitations/{invitationId}/send-email** *— Queue wedding invitation email*

| **Property**     | **Contract**                                                                                                                                                                                  |
|------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Member                                                                                                                                                                                        |
| CSRF             | Yes                                                                                                                                                                                           |
| Request body     | Optional { recipientEmail? }                                                                                                                                                                  |
| Query / path     | Idempotency-Key required                                                                                                                                                                      |
| Success          | 202 Accepted { deliveryId, status: QUEUED }                                                                                                                                                   |
| Rules            | Resolve recipient email; issue fresh RSVP capability link for this message; create EmailDelivery then enqueue SQS with deliveryId and rendered variables. HTTP request does not wait for SES. |
| Important errors | 422 no recipient email; 409 duplicate idempotency key; 503 queue unavailable.                                                                                                                 |

**POST /api/v1/weddings/{weddingId}/invitations/reminders** *— Queue RSVP reminders for pending recipients*

| **Property**     | **Contract**                                                                                                                                                          |
|------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Member                                                                                                                                                                |
| CSRF             | Yes                                                                                                                                                                   |
| Request body     | { eventId?, invitationIds?, pendingOnly: true }                                                                                                                       |
| Query / path     | Idempotency-Key required                                                                                                                                              |
| Success          | 202 Accepted { queuedCount }                                                                                                                                          |
| Rules            | Pending is derived by invited guest-event pairs with no RSVP row. Only invitations with usable email recipients are queued. Apply conservative max batch per request. |
| Important errors | 422 filter invalid; 429 bulk-email action rate-limited.                                                                                                               |

WhatsApp Share does not require a backend WhatsApp API. The frontend calls the access-link endpoint, URL-encodes a pre-filled message, and opens WhatsApp/WhatsApp Web. No delivery tracking is promised for WhatsApp V1.

# 19. RSVP APIs

## 19.1 Member RSVP view/override

**GET /api/v1/weddings/{weddingId}/rsvps** *— List RSVP responses and computed pending state*

| **Property**     | **Contract**                                                                       |
|------------------|------------------------------------------------------------------------------------|
| Authentication   | Member                                                                             |
| CSRF             | No                                                                                 |
| Request body     | None                                                                               |
| Query / path     | eventId, guestId, familyId, status, cursor                                         |
| Success          | 200 OK                                                                             |
| Rules            | Query RSVP rows and derive pending from guest invitedEventIds minus existing rows. |
| Important errors | 403/404.                                                                           |

**PUT /api/v1/weddings/{weddingId}/rsvps/{guestId}/{eventId}** *— Create or override one response*

| **Property**     | **Contract**                                                                                                                                                  |
|------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Member                                                                                                                                                        |
| CSRF             | Yes                                                                                                                                                           |
| Request body     | { status, plusOneCount?, foodPreference?, guestMessage? }                                                                                                     |
| Query / path     | guestId + eventId                                                                                                                                             |
| Success          | 200 OK RSVPDTO                                                                                                                                                |
| Rules            | Guest must be invited to event. PUT is idempotent for same body. Admin/Manager override source should be recorded internally if audit fields are implemented. |
| Important errors | 422 NOT_INVITED_TO_EVENT.                                                                                                                                     |

**DELETE /api/v1/weddings/{weddingId}/rsvps/{guestId}/{eventId}** *— Reset response to pending*

| **Property**     | **Contract**                                           |
|------------------|--------------------------------------------------------|
| Authentication   | Member                                                 |
| CSRF             | Yes                                                    |
| Request body     | None                                                   |
| Query / path     | guestId + eventId                                      |
| Success          | 204 No Content                                         |
| Rules            | Delete RSVP record; pending is represented by absence. |
| Important errors | 404 may be treated as 204 for idempotence.             |

## 19.2 Guest household submission

**PUT /api/v1/public/invitations/{token}/rsvps** *— Submit household/event responses*

| **Property**     | **Contract**                                                                                                                                                                                               |
|------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Guest token INVITATION_RSVP                                                                                                                                                                                |
| CSRF             | No auth-cookie CSRF                                                                                                                                                                                        |
| Request body     | { responses: \[...\] }                                                                                                                                                                                     |
| Query / path     | token                                                                                                                                                                                                      |
| Success          | 200 OK { responses, summary }                                                                                                                                                                              |
| Rules            | Token -\> Invitation -\> allowed guestIds. Each guest/event pair must be inside invitation recipient snapshot and guest.invitedEventIds. Use transaction or bulkWrite for consistent household submission. |
| Important errors | 404 PUBLIC_LINK_INVALID; 422 NOT_INVITED_TO_EVENT / INVALID_GUEST_FOR_INVITATION; 429.                                                                                                                     |

{  
"responses": \[  
{  
"guestId": "...",  
"eventId": "...",  
"status": "ATTENDING",  
"plusOneCount": 0,  
"foodPreference": "VEG",  
"guestMessage": "Looking forward to it!"  
}  
\]  
}

# 20. Expense APIs

| **Operation** | **Endpoint**                                      | **Contract**                                                                                         |
|---------------|---------------------------------------------------|------------------------------------------------------------------------------------------------------|
| List          | GET /weddings/{weddingId}/expenses                | Filters eventId, vendorId, category, paymentStatus, cursor; return computed remainingAmountPaise.    |
| Create        | POST /weddings/{weddingId}/expenses               | totalAmountPaise integer \>=0; amountPaidPaise integer 0..total; optional event/vendor same wedding. |
| Read          | GET /weddings/{weddingId}/expenses/{expenseId}    | Return ExpenseDTO with computed remaining amount.                                                    |
| Update        | PATCH /weddings/{weddingId}/expenses/{expenseId}  | Revalidate paid \<= total after applying patch.                                                      |
| Delete        | DELETE /weddings/{weddingId}/expenses/{expenseId} | Delete according to history policy.                                                                  |

{  
"title": "Wedding Photographer",  
"category": "PHOTOGRAPHY",  
"eventId": null,  
"vendorId": "...",  
"totalAmountPaise": 15000000,  
"amountPaidPaise": 5000000,  
"paymentDate": "2027-01-15T00:00:00.000Z",  
"paidBy": "Bride family",  
"notes": "Second installment due before wedding"  
}

# 21. Vendor and Discovery APIs

## 21.1 My Vendors

Vendor CRUD stores wedding-owned data only. A saved Google Places result becomes a normal Vendor with source=GOOGLE_PLACES and optional googlePlaceId. The application does not treat changing Google rating/review data as authoritative persisted vendor data.

## 21.2 Nearby discovery

**GET /api/v1/weddings/{weddingId}/vendor-discovery/search** *— Search Google Places through backend*

| **Property**     | **Contract**                                                                                                                |
|------------------|-----------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Member                                                                                                                      |
| CSRF             | No                                                                                                                          |
| Request body     | None                                                                                                                        |
| Query / path     | q/category + location/lat/lng + radius + cursor/providerPageToken                                                           |
| Success          | 200 OK discovery results                                                                                                    |
| Rules            | Protect provider key server-side; whitelist categories; enforce radius/result limits; do not persist results automatically. |
| Important errors | 422 invalid location; 502/503 PLACES_UNAVAILABLE.                                                                           |

**POST /api/v1/weddings/{weddingId}/vendors/from-discovery** *— Save selected Google place*

| **Property**     | **Contract**                                                                                   |
|------------------|------------------------------------------------------------------------------------------------|
| Authentication   | Member                                                                                         |
| CSRF             | Yes                                                                                            |
| Request body     | { googlePlaceId, category }                                                                    |
| Query / path     | weddingId                                                                                      |
| Success          | 201 Created VendorDTO                                                                          |
| Rules            | Backend fetches/validates place details; dedupe by weddingId + googlePlaceId when appropriate. |
| Important errors | 409 VENDOR_ALREADY_SAVED; 502 provider unavailable.                                            |

# 22. Wedding Website and Livestream APIs

## 22.1 Website configuration

**PUT /api/v1/weddings/{weddingId}/website** *— Create/replace wedding website configuration*

| **Property**     | **Contract**                                                                                                                 |
|------------------|------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Member                                                                                                                       |
| CSRF             | Yes                                                                                                                          |
| Request body     | WeddingWebsiteRequest                                                                                                        |
| Query / path     | weddingId                                                                                                                    |
| Success          | 200/201                                                                                                                      |
| Rules            | One website config per wedding. Slug globally unique. Theme enum: CLASSICAL_INDIAN \| MINIMAL_ELEGANT \| MODERN_CELEBRATION. |
| Important errors | 409 SLUG_TAKEN; 422 invalid slug/theme.                                                                                      |

**POST /api/v1/weddings/{weddingId}/website/publish** *— Publish guest-facing site*

| **Property**     | **Contract**                                                                                                         |
|------------------|----------------------------------------------------------------------------------------------------------------------|
| Authentication   | Member                                                                                                               |
| CSRF             | Yes                                                                                                                  |
| Request body     | None                                                                                                                 |
| Query / path     | weddingId                                                                                                            |
| Success          | 200 OK WeddingWebsiteDTO                                                                                             |
| Rules            | Require minimally complete wedding/site data; set isPublished=true and publishedAt. Frontend emits noindex metadata. |
| Important errors | 422 WEBSITE_NOT_READY.                                                                                               |

**GET /api/v1/wedding-websites/slug-availability** *— Check slug availability*

| **Property**     | **Contract**                                                                           |
|------------------|----------------------------------------------------------------------------------------|
| Authentication   | Authenticated                                                                          |
| CSRF             | No                                                                                     |
| Request body     | None                                                                                   |
| Query / path     | slug                                                                                   |
| Success          | 200 OK { available }                                                                   |
| Rules            | Normalize lowercase; endpoint is advisory only; PUT/PATCH still enforces unique index. |
| Important errors | 422 invalid slug.                                                                      |

## 22.2 Livestream

Livestream CRUD validates provider=YOUTUBE in V1 and normalizes/validates YouTube URLs. Make My Marriage stores metadata only; no streaming credentials or video bytes pass through the backend.

# 23. Photo Album, Photo, and Upload APIs

## 23.1 Member direct-upload flow

1\. POST /weddings/{id}/photos/uploads/presign  
2. Backend validates \<=20 files, each \<=15 MB, JPEG/PNG/WebP  
3. Backend generates server-owned S3 keys + short-lived presigned PUT URLs  
4. Browser uploads bytes directly to private S3  
5. POST /weddings/{id}/photos/uploads/complete  
6. Backend HEAD-checks object/key/size/type and creates APPROVED Photo metadata  
7. Gallery reads via derived CloudFront/display URL

**POST /api/v1/weddings/{weddingId}/photos/uploads/presign** *— Presign up to 20 member photo uploads*

| **Property**     | **Contract**                                                                                                                     |
|------------------|----------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Member                                                                                                                           |
| CSRF             | Yes                                                                                                                              |
| Request body     | { files: \[{ fileName, mimeType, sizeBytes, eventId?, albumId? }\] }                                                             |
| Query / path     | weddingId                                                                                                                        |
| Success          | 200 OK upload descriptors                                                                                                        |
| Rules            | Allowed MIME only image/jpeg, image/png, image/webp; max 15 MB each; server generates S3 key; validate event/album same wedding. |
| Important errors | 413 FILE_TOO_LARGE; 415 UNSUPPORTED_MEDIA_TYPE; 422 batch \>20.                                                                  |

{  
"data": {  
"uploads": \[  
{  
"uploadId": "...",  
"s3Key": "weddings/\<weddingId\>/photos/\<uuid\>.jpg",  
"method": "PUT",  
"url": "\<short-lived-presigned-url\>",  
"requiredHeaders": { "Content-Type": "image/jpeg" },  
"expiresInSeconds": 900  
}  
\]  
}  
}

**POST /api/v1/weddings/{weddingId}/photos/uploads/complete** *— Create Photo metadata after successful S3 upload*

| **Property**     | **Contract**                                                                                                                                                                |
|------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Member                                                                                                                                                                      |
| CSRF             | Yes                                                                                                                                                                         |
| Request body     | { uploads: \[{ s3Key, originalFileName, eventId?, albumId? }\] }                                                                                                            |
| Query / path     | weddingId                                                                                                                                                                   |
| Success          | 201 Created                                                                                                                                                                 |
| Rules            | HEAD S3 object before persistence; verify key prefix belongs wedding and object size/type within contract; dedupe by unique s3Key; member upload moderationStatus=APPROVED. |
| Important errors | 409 PHOTO_ALREADY_REGISTERED; 422 INVALID_S3_OBJECT.                                                                                                                        |

## 23.2 Moderation

**PATCH /api/v1/weddings/{weddingId}/photos/{photoId}/moderation** *— Approve/reject guest photo*

| **Property**     | **Contract**                                                                                                             |
|------------------|--------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Member                                                                                                                   |
| CSRF             | Yes                                                                                                                      |
| Request body     | { status: APPROVED \| REJECTED }                                                                                         |
| Query / path     | photoId                                                                                                                  |
| Success          | 200 OK PhotoDTO                                                                                                          |
| Rules            | Only PENDING guest uploads normally transition through moderation. Record moderator membership id if audit field exists. |
| Important errors | 409 INVALID_MODERATION_TRANSITION.                                                                                       |

## 23.3 Guest photo-upload capability

**POST /api/v1/weddings/{weddingId}/photo-upload-links** *— Issue guest photo-upload link*

| **Property**     | **Contract**                                                                                                                           |
|------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | Member                                                                                                                                 |
| CSRF             | Yes                                                                                                                                    |
| Request body     | { expiresAt? }                                                                                                                         |
| Query / path     | weddingId                                                                                                                              |
| Success          | 201 Created { tokenId, url, expiresAt }                                                                                                |
| Rules            | Create GuestAccessToken purpose PHOTO_UPLOAD. Raw URL returned once; token hash stored. QR is generated client-side from returned URL. |
| Important errors | 422 expiry invalid.                                                                                                                    |

**POST /api/v1/public/photo-uploads/{token}/complete** *— Register guest-uploaded photos*

| **Property**     | **Contract**                                                                                                 |
|------------------|--------------------------------------------------------------------------------------------------------------|
| Authentication   | Guest token PHOTO_UPLOAD                                                                                     |
| CSRF             | No auth-cookie CSRF                                                                                          |
| Request body     | { uploads: \[...\] }                                                                                         |
| Query / path     | token                                                                                                        |
| Success          | 201 Created                                                                                                  |
| Rules            | Same S3 integrity checks as member complete endpoint; moderationStatus=PENDING; never grant RSVP capability. |
| Important errors | 404 PUBLIC_LINK_INVALID; 409 duplicate key; 422 invalid object.                                              |

# 24. Public Guest APIs

| **Endpoint**                                | **Data exposed**                                  | **Important rule**                                                         |
|---------------------------------------------|---------------------------------------------------|----------------------------------------------------------------------------|
| GET /public/weddings/{slug}                 | Published wedding/site summary                    | Only if isPublished=true and Wedding not deleted; exclude internal fields. |
| GET /public/weddings/{slug}/events          | Guest-facing event schedule                       | No tasks, expenses, guest lists, team info, or internal notes.             |
| GET /public/weddings/{slug}/gallery/albums  | Public album summaries                            | Only albums with approved visible content.                                 |
| GET /public/weddings/{slug}/gallery/photos  | APPROVED photo metadata/display URLs              | Cursor pagination; never PENDING/REJECTED.                                 |
| GET /public/weddings/{slug}/livestreams     | Guest-facing livestream metadata                  | No internal notes.                                                         |
| GET /public/invitations/{token}             | Invitation household/event context + current RSVP | Opaque token required; response limited to invitation recipient snapshot.  |
| PUT /public/invitations/{token}/rsvps       | RSVP mutation                                     | Only allowed guestIds/eventIds.                                            |
| GET /public/photo-uploads/{token}           | Wedding name + uploadable events/context          | PHOTO_UPLOAD token only.                                                   |
| POST /public/photo-uploads/{token}/presign  | Guest S3 upload permissions                       | Same 15 MB / 20-file constraints; narrower S3 prefix if desired.           |
| POST /public/photo-uploads/{token}/complete | Create PENDING Photo records                      | No gallery approval automatically.                                         |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Noindex is a frontend concern</strong></p>
<p>The public wedding API is public-by-link. The Next.js public wedding page should emit robots noindex metadata. noindex is not a substitute for access control and should not be used for RSVP/photo-upload capabilities.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 25. Email Queue and SES Event Processing

## 25.1 HTTP-to-queue boundary

HTTP command  
-\> validate wedding/member + recipient  
-\> create EmailDelivery { status: QUEUED }  
-\> enqueue SQS message containing deliveryId + safe render variables  
-\> return 202 Accepted  
  
Worker  
-\> load EmailDelivery/domain records  
-\> send through SES  
-\> update SENT / FAILED + attemptCount/providerMessageId

The browser never waits for SES. Queueing endpoints return 202. Bulk actions should use Idempotency-Key and conservative limits. SQS retry/dead-letter handling belongs to worker infrastructure, not client retry loops.

## 25.2 SES event webhook

**POST /webhooks/aws/ses** *— Process SES feedback event*

| **Property**     | **Contract**                                                                                                                                                                      |
|------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Authentication   | AWS SNS signature                                                                                                                                                                 |
| CSRF             | No browser CSRF                                                                                                                                                                   |
| Request body     | AWS SNS/SES event body                                                                                                                                                            |
| Query / path     | Provider headers/signature                                                                                                                                                        |
| Success          | 200 OK                                                                                                                                                                            |
| Rules            | Verify SNS signature/certificate before parsing. Map SES message/event to EmailDelivery and set BOUNCED/COMPLAINED/DELIVERED when supported. Never trust unsigned event payloads. |
| Important errors | 400 invalid signature/payload; 404 unknown provider message may still return 200 after logging depending retry policy.                                                            |

# 26. Resource DTO Contracts

DTOs are intentionally smaller and safer than MongoDB documents. The backend maps persistence models to API DTOs and never serializes Mongoose documents wholesale.

| **DTO**           | **Representative V1 fields**                                                                                                                             |
|-------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| UserDTO           | id, name, email, emailVerifiedAt, status, createdAt                                                                                                      |
| WeddingSummaryDTO | id, title, brideName, groomName, weddingDate, location, role, coverImage?                                                                                |
| WeddingDTO        | Summary fields + timezone, currency, description, expectedGuestCount, coupleImage, coverImage, createdAt, updatedAt                                      |
| MembershipDTO     | id, user { id,name,email }, role, status, joinedAt                                                                                                       |
| EventDTO          | id, weddingId, name, description, startAt, endAt, venueName, address, mapUrl, dressCode, coverImage, notes                                               |
| TaskDTO           | id, weddingId, eventId, title, description, assigneeMembership summary, dueAt, priority, status, notes                                                   |
| GuestFamilyDTO    | id, name, primaryContactGuestId, notes, memberCount                                                                                                      |
| GuestDTO          | id, familyId, fullName, email?, phone?, relationship?, side?, city?, invitedEventIds, notes, computed rsvpSummary?                                       |
| InvitationDTO     | id, guestFamilyId?, guestIds, status, sendCount, lastSentAt, createdAt; never tokenHash                                                                  |
| RSVPDTO           | id, invitationId, guestId, eventId, status, plusOneCount, foodPreference?, guestMessage?, respondedAt                                                    |
| ExpenseDTO        | id, eventId?, vendorId?, title, category, totalAmountPaise, amountPaidPaise, remainingAmountPaise(computed), paymentStatus, paymentDate?, paidBy?, notes |
| VendorDTO         | id, source, googlePlaceId?, name, category, contactPerson?, phone?, email?, location?, eventIds, notes                                                   |
| WeddingWebsiteDTO | id, slug, theme, isPublished, ourStory?, publishedAt?, updatedAt                                                                                         |
| LivestreamDTO     | id, eventId?, title, provider, url, scheduledAt?, description?, isVisible                                                                                |
| PhotoAlbumDTO     | id, eventId?, type, name, coverPhotoId?, sortOrder, photoCount?                                                                                          |
| PhotoDTO          | id, albumId?, eventId?, originalFileName, mimeType, sizeBytes, width?, height?, moderationStatus, uploaderType, displayUrl, createdAt                    |

# 27. Validation and Business Rules

| **Area**     | **V1 validation / rule**                                                                                   |
|--------------|------------------------------------------------------------------------------------------------------------|
| Object ids   | Reject malformed 24-hex ObjectIds before DB query; still scope query by weddingId.                         |
| Email        | Normalize for auth; guest email optional and not unique.                                                   |
| Password     | Minimum policy + breached/common-password protections may be added; always Argon2id hash.                  |
| Wedding      | currency=INR; timezone defaults Asia/Kolkata; no fixed total budget.                                       |
| Event        | endAt \>= startAt; referenced event images must be valid media refs.                                       |
| Task         | assigneeMembershipId must be ACTIVE in same wedding.                                                       |
| Guest        | invitedEventIds must all belong to same wedding.                                                           |
| Invitation   | guestIds must belong to wedding and snapshot target recipients.                                            |
| RSVP         | guest must be in Invitation guestIds and invited to event. Pending is absence, not a stored status.        |
| Expense      | integer paise; 0 \<= amountPaidPaise \<= totalAmountPaise; remaining is computed.                          |
| Website slug | lowercase slug pattern, globally unique; public route only if isPublished.                                 |
| Livestream   | YOUTUBE only in V1; validate URL host/id shape.                                                            |
| Photos       | JPEG/PNG/WebP only; \<=15 MB each; \<=20 files/presign batch; S3 object must exist before metadata insert. |
| Roles        | ADMIN/MANAGER only; never leave wedding with zero ACTIVE Admins.                                           |

# 28. Idempotency, Transactions, and Concurrency

## 28.1 Idempotency

PUT endpoints are naturally idempotent. DELETE endpoints should generally be safe to repeat. High-risk command endpoints that can create duplicate external effects should accept Idempotency-Key, especially invitation send and bulk reminder actions. The backend stores a short-lived result keyed by user/wedding/action/idempotency key or uses a durable command record when needed.

## 28.2 MongoDB transactions required/recommended

- Create Wedding + first ADMIN WeddingMembership.

- Accept Manager invitation + create/reactivate membership + mark TeamInvitation ACCEPTED.

- Demote/remove an Admin while checking that at least one ACTIVE Admin remains.

- Household RSVP submission when multiple guest/event responses should succeed as one logical action.

- Refresh-token rotation when old and replacement RefreshSession state must be consistent.

## 28.3 Concurrency examples

Website slug uniqueness relies on a unique database index even if the frontend performs an availability check. Photo complete relies on unique s3Key to make retry handling safe. Expense update must validate paid \<= total after applying the complete patch, not against stale pre-update values.

# 29. Rate Limiting and Abuse Protection

| **Route family**                                 | **Recommended starting policy (configurable)**                                         |
|--------------------------------------------------|----------------------------------------------------------------------------------------|
| Login                                            | 5 failed attempts / 15 min per IP + normalized email, then progressive delay/429.      |
| Register / resend verification / forgot password | 3-5 actions / 15 min per IP/email depending action.                                    |
| Refresh                                          | Generous normal-session limit; aggressive protection on invalid/reused tokens.         |
| Public RSVP                                      | Approx. 30 requests/min per token + IP; lower write burst threshold.                   |
| Guest presign/complete                           | Limit by token + IP and the 20-file batch contract.                                    |
| Vendor discovery                                 | Provider-aware quota throttling per user/wedding.                                      |
| Bulk email commands                              | Small command rate + max recipients per action; worker separately respects SES quotas. |

Exact values should live in environment/configuration and may change after staging load tests. Rate-limit keys must avoid storing raw guest tokens in logs or external limiter stores where possible; hash the token first.

# 30. Security Requirements

- HTTPS outside local development.

- Access and refresh credentials in HttpOnly cookies; no localStorage token persistence.

- CSRF header + same-site cookie + Origin allow-list for cookie-authenticated state changes.

- Exact CORS allow-list if direct cross-origin calls are enabled; credentials=true; never wildcard origin with credentials.

- Argon2id password hashing; constant-time credential checks where applicable.

- Hash one-time and public capability tokens before database storage.

- Validate membership before every wedding-scoped operation and include weddingId in child queries.

- Keep S3 private; presigned URLs are short-lived and server-generated; validate object after upload.

- Never trust client filenames to construct S3 keys.

- Validate MIME type, declared size, and uploaded object metadata; future malware scanning can be added if required.

- Provider secrets (SES, Google Places, AWS) remain server-side and never appear in Next.js public environment variables.

- Redact passwords, cookies, JWTs, refresh tokens, guest raw tokens, PII-heavy request bodies, and presigned URLs from logs.

- Use generic public-token errors to reduce capability enumeration.

- Add standard security headers (CSP where practical, X-Content-Type-Options, Referrer-Policy, frame controls) at frontend/backend boundary.

# 31. Performance, Caching, and Payload Design

- Dashboard should be one aggregate endpoint rather than many frontend requests; optimize with MongoDB indexes before adding Redis.

- Public wedding page data may use short CDN/Next caching where safe, but RSVP/photo token responses must be private/no-store.

- Photo bytes are delivered through CloudFront, not Express. API returns derived display URLs/metadata only.

- Large guest/photo/invitation lists use cursor pagination and projection to avoid loading full documents unnecessarily.

- Use lean Mongoose queries for read-only DTO projections where helpful.

- Google Places search may use short backend caching if provider terms allow; no need to persist every result.

- Email APIs return 202 after queueing, avoiding synchronous SES latency.

# 32. Logging and Request Tracing

Backend logging uses Pino. Each request receives requestId and logs method, route template, status, duration, authenticated user id when safe, weddingId when safe, and error code. Never log secrets or sensitive guest payloads.

{  
"level": "info",  
"requestId": "req\_...",  
"method": "POST",  
"route": "/api/v1/weddings/:weddingId/invitations/:invitationId/send-email",  
"statusCode": 202,  
"durationMs": 84,  
"userId": "...",  
"weddingId": "..."  
}

Public-token routes may log a short hash prefix/fingerprint for correlation, never the raw bearer token. External provider failures should include provider name and sanitized error classification, not raw credentials or full response bodies containing PII.

# 33. API Versioning and OpenAPI Strategy

V1 uses URL versioning: /api/v1. Breaking changes require /api/v2 or an explicitly managed migration; additive optional response fields may be introduced within V1. Clients should ignore unknown response fields.

When implementation starts, the backend should maintain an OpenAPI 3.x specification as an executable companion to this document. Zod schemas should be structured so request DTO validation and OpenAPI generation can share definitions where practical. The repository is intentionally not being created as part of this document.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>Source of truth during implementation</strong></p>
<p>This design document defines intent and contract. Once code exists, CI should validate the OpenAPI spec and endpoint tests so implementation drift is caught early.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 34. Testing Strategy

| **Layer**                 | **Required coverage**                                                                                                   |
|---------------------------|-------------------------------------------------------------------------------------------------------------------------|
| Unit                      | Zod DTOs, service rules, token hashing/expiry, money validation, URL validation.                                        |
| Integration API           | Auth cookie lifecycle, membership isolation, Admin-only team changes, CRUD tenant scoping, public token purpose checks. |
| MongoDB transaction tests | Wedding creation, Manager acceptance, last-Admin safeguards, RSVP household write, refresh rotation.                    |
| S3 integration            | Presign constraints, wrong key/wedding rejection, HEAD verification, duplicate complete retry.                          |
| SES/SQS integration       | 202 queue response, EmailDelivery state transitions, retry behavior, bounce/complaint webhook.                          |
| Security tests            | CSRF missing/mismatch, CORS origin, token replay, cross-wedding ids, invalid public tokens, rate limits.                |
| Contract/E2E              | Next.js flow: signup -\> verify -\> login -\> wedding -\> invitation -\> guest RSVP -\> guest upload -\> moderation.    |

# 35. Implementation Order

| **Implementation phase**    | **Primary API scope**                                                      |
|-----------------------------|----------------------------------------------------------------------------|
| Phase 1 — Foundation/Auth   | /auth/\*, /users/me, error middleware, Zod, requestId, CSRF, rate limiting |
| Phase 2 — Wedding/Team      | /weddings, membership middleware, /team/\*, Manager invitation acceptance  |
| Phase 3 — Events/Dashboard  | events CRUD + dashboard aggregates                                         |
| Phase 4 — Tasks             | task CRUD/filtering/assignment                                             |
| Phase 5 — Guests/Households | guestFamilies + guests + event invitation associations                     |
| Phase 6 — Expenses/Vendors  | expense CRUD + My Vendors                                                  |
| Phase 7 — Wedding Website   | website config/slug/publish + public published wedding reads               |
| Phase 8 — Invitations/RSVP  | invitation creation/link issue, SQS email commands, public RSVP, reminders |
| Phase 9 — Livestream/QR     | livestream CRUD/public read; QR remains frontend-generated from API URLs   |
| Phase 10 — Photos           | albums, S3 presign/complete, public upload tokens, moderation, gallery     |
| Phase 11 — Vendor Discovery | Google Places proxy + save selected business                               |

This order mirrors the approved PRD and database implementation plan. Shared middleware (authentication, membership, validation, error mapping, logging) should be implemented once and reused rather than duplicated inside each module.

# 36. Final API Decision Summary

| **Decision area** | **V1 contract**                                                               |
|-------------------|-------------------------------------------------------------------------------|
| API style         | REST over HTTPS; /api/v1 URL versioning                                       |
| Browser auth      | Custom access JWT + rotating refresh session in HttpOnly cookies              |
| CSRF              | Same-site CSRF token/header + Origin validation                               |
| Tenant boundary   | weddingId + ACTIVE WeddingMembership on every authenticated wedding operation |
| Roles             | ADMIN / MANAGER; ADMIN only for Wedding Team management                       |
| Public guest auth | Purpose-limited opaque random tokens stored only as hashes                    |
| Guest website     | Public-by-link + noindex rendered by Next.js                                  |
| Pagination        | Cursor-based for large collections; default 20/max 100                        |
| Money             | Integer paise; remaining amount computed                                      |
| RSVP              | One row per guest + event; pending = absence                                  |
| Photos            | Presigned direct-to-S3; 15 MB/photo; 20/batch; member APPROVED, guest PENDING |
| Photo delivery    | Private S3 + CloudFront-derived URLs                                          |
| Email             | HTTP command -\> EmailDelivery -\> SQS -\> SES; 202 Accepted                  |
| WhatsApp          | Frontend share/deep link only; no WhatsApp API V1                             |
| Vendor discovery  | Backend proxy to Google Places; persist only selected vendors                 |
| Livestream        | YouTube metadata/link only                                                    |
| Logging           | Pino + requestId; secrets/PII redacted                                        |
| OpenAPI           | Create OpenAPI 3.x companion when backend implementation starts               |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p><strong>API design baseline approved by product architecture</strong></p>
<p>This document is designed to be implemented without introducing microservices, a complex RBAC system, a payment platform, a budgeting engine, or guest accounts. Those boundaries remain intentional V1 product decisions.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>
