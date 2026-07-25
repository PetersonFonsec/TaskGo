---
status: completed
title: Enforce authenticated provider identity and role boundaries
type: backend
complexity: medium
dependencies: []
---

# Task 04: Enforce authenticated provider identity and role boundaries

## Overview
Establish one reusable authenticated identity boundary for singular `/provider/me` and `/user/me` operations, deriving the acting user exclusively from the validated access token. Replace the current permissive role stub with effective `PRESTADOR` enforcement so later profile, payout, photo, social, and completion endpoints cannot act for another user or accept the wrong customer role.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. Protected `/me` operations MUST derive the authenticated user identifier from the access token populated by `AuthGuard`; route parameters and request bodies MUST NOT select the acting user or provider.
- 2. The backend MUST provide a reusable, typed authenticated-identity mechanism that exposes the token-derived user ID and the verified user role needed by provider-scoped controllers.
- 3. The role boundary MUST deny authenticated `CLIENTE` users access to endpoints requiring `PRESTADOR` and MUST allow verified `PRESTADOR` users.
- 4. `RolesGuard` MUST replace its unconditional success behavior with metadata-driven enforcement and MUST deny protected role checks when identity or role information is absent, invalid, or unsupported.
- 5. Public routes and authenticated routes without role metadata MUST preserve their current behavior.
- 6. Identity and role decisions MUST rely on validated server-controlled state; the implementation MUST NOT trust a role supplied in request headers, query strings, parameters, or bodies.
- 7. The reusable boundary MUST support the singular `/provider/me` and `/user/me` route convention selected for this feature without changing existing public provider-by-ID routes.
</requirements>

## Subtasks
- [x] 04.1 Define the canonical authenticated identity shape required by `/me` endpoints.
- [x] 04.2 Make validated user identity and verified role available to downstream request handlers.
- [x] 04.3 Define provider-role metadata that controllers can apply consistently.
- [x] 04.4 Replace the permissive `RolesGuard` stub with effective metadata-driven role enforcement.
- [x] 04.5 Register the role boundary in the authenticated request pipeline while preserving public and role-neutral routes.
- [x] 04.6 Add unit and integration coverage for provider, customer, missing-identity, public, and role-neutral request behavior.

## Implementation Details
Use the existing global `AuthGuard` as the authentication boundary and the existing `User` request decorator as the starting point for token-derived identity. The current token carries an ID but the existing `RolesGuard` always returns `true`; the completed boundary must obtain role information from server-controlled authenticated state before authorizing a provider operation. Refer to the TechSpec “API Endpoints” and “Impact Analysis” sections for role and ownership expectations.

Keep this task limited to reusable authentication and authorization primitives plus representative route-pipeline verification. Domain controllers introduced by later tasks will apply the boundary to singular `/provider/me` and `/user/me` endpoints. Do not redesign administrative authorization, change public provider discovery endpoints, or add user IDs to `/me` payloads.

### Relevant Files
- `apps/backend/src/modules/auth/auth.guard.ts` — Validates bearer tokens globally and attaches decoded identity to the request.
- `apps/backend/src/modules/auth/auth-token.service.ts` — Defines the signed and decoded customer token payload currently containing the user ID.
- `apps/backend/src/shared/decorators/user.decorator.ts` — Existing request decorator for reading token-derived identity.
- `apps/backend/src/shared/guards/roles/roles.guard.ts` — Current unconditional role-authorization stub that must become effective.

### Dependent Files
- `apps/backend/src/shared/guards/roles/roles.guard.spec.ts` — Existing placeholder test suite to expand with concrete authorization behavior.
- `apps/backend/src/modules/auth/auth.guard.integration.spec.ts` — Existing request-pipeline coverage for public, protected, and token-derived identity behavior.
- `apps/backend/src/app.module.ts` — Registers global request guards and must preserve authentication-before-authorization ordering.

### Related ADRs
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — Requires provider-scoped singular routes and token-derived user/provider identifiers for all focused mutations and completion queries.

## Deliverables
- Reusable typed authenticated identity available to protected `/me` request handlers.
- Declarative provider-role metadata and a working `RolesGuard` that enforces `PRESTADOR`.
- Request-pipeline registration that preserves public and role-neutral authenticated routes.
- Representative integration coverage proving singular `/me` handlers cannot select or impersonate another user.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for authenticated provider identity and role enforcement **(REQUIRED)**

## Tests
- Unit tests:
  - [x] `RolesGuard` allows a verified `PRESTADOR` identity when the handler requires the provider role.
  - [x] `RolesGuard` rejects a verified `CLIENTE` identity when the handler requires `PRESTADOR`.
  - [x] `RolesGuard` rejects a provider-role requirement when the request has no authenticated identity, no verified role, or an unsupported role value.
  - [x] `RolesGuard` allows an authenticated handler with no role metadata to preserve existing role-neutral behavior.
  - [x] The authenticated identity decorator returns the token-derived user ID and verified role and does not read identity values from request payload fields.
- Integration tests:
  - [x] A bearer token resolving to `PRESTADOR` receives success from a representative `/provider/me` endpoint.
  - [x] A bearer token resolving to `CLIENTE` receives `403` from the same provider-only endpoint.
  - [x] An anonymous request receives `401` before the provider-role decision is evaluated.
  - [x] A request whose body or query contains another `userId` still exposes only the authenticated token-derived ID to the handler.
  - [x] A `@Public` route remains anonymously accessible and a protected route without role metadata remains accessible to either authenticated customer role.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Provider-only endpoints consistently return `403` for authenticated customers and succeed for verified providers.
- Anonymous protected requests continue to return `401`, while public routes retain anonymous access.
- `/me` handlers receive a server-controlled authenticated identity and cannot choose another acting user from request input.
- The role guard no longer contains an unconditional allow path for handlers declaring role requirements.
