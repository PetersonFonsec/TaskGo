---
status: completed
title: Implement administrative JWT authentication
type: backend
complexity: high
dependencies:
  - task_01
---

# Task 02: Implement administrative JWT authentication

## Overview
Add a dedicated administrative login and identity lookup flow while reusing the current JWT signing secret. Administrative tokens must be distinguishable from marketplace tokens and invalidatable through the persisted token version.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST expose POST /admin/auth/login and GET /admin/auth/me under a dedicated module.
2. MUST issue claims for admin subject, tokenKind=admin, fixed role, and token version.
3. MUST reject inactive, unactivated, unknown, and invalid-credential operators.
4. MUST never expose password hashes or invitation secrets.
5. SHOULD reuse the existing bcrypt and JwtModule dependencies without changing marketplace token contracts.
</requirements>

## Subtasks
- [x] 02.1 Create the administrative authentication module and DTOs.
- [x] 02.2 Implement credential validation and administrative token issuance.
- [x] 02.3 Implement the authenticated current-operator response.
- [x] 02.4 Register the module under the existing NestJS application.
- [x] 02.5 Add unit and API integration coverage.

## Implementation Details
Follow TechSpec "Administrative JWT" and keep the public `AuthModule` behavior unchanged.

### Relevant Files
- `apps/backend/src/modules/auth/auth-token.service.ts` — current JWT convention.
- `apps/backend/src/modules/auth/auth.module.ts` — existing JwtModule registration.
- `apps/backend/src/modules/auth/queries/login/login.handle.ts` — credential validation pattern.

### Dependent Files
- `apps/backend/src/app.module.ts` — registers the administrative boundary.
- `apps/backend/test/e2e/auth.e2e-spec.ts` — authentication E2E conventions.

### Related ADRs
- [ADR-002: Separate Backoffice Frontend With Shared API](adrs/adr-002.md)
- [ADR-003: Dedicated Administrative Identities With Shared JWT Secret](adrs/adr-003.md)

## Deliverables
- Administrative login and identity endpoints.
- Administrative token service and response DTOs.
- App-module registration without marketplace-auth regression.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for login and token claims **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Correct password for an active operator produces all required claims.
  - [x] Wrong password, inactive account, and missing password each fail without a token.
- Integration tests:
  - [x] POST /admin/auth/login returns an administrative token for a valid operator.
  - [x] GET /admin/auth/me returns no password or invitation fields.
  - [x] Existing /auth/login tokens and responses remain unchanged.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Administrative and marketplace tokens have distinct claim shapes.
- No administrative secret appears in API responses.
