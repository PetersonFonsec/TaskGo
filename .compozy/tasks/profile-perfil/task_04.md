---
status: completed
title: "Backend: add phone/email verification trigger endpoints and pending-verification state support"
type: backend
complexity: medium
dependencies:
  - task_02
---

# Task 04: Backend: add phone/email verification trigger endpoints and pending-verification state support

## Overview
Add endpoints and server-side state to trigger and track phone/email verification for profile changes. When a user updates phone or email, the backend should allow storing the new value in a pending state and trigger verification workflows without exposing tokens.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Provide endpoints to request verification: `POST /profiles/:id/verify-email` and `POST /profiles/:id/verify-phone`.
- Add DB fields or columns to track `emailVerified`, `phoneVerified`, and `pendingEmail` / `pendingPhone` (or equivalent) to support pending verification state.
- Triggering verification MUST enqueue or call the verification provider (mockable in tests) without returning verification tokens in responses.
- Ensure verification acceptance endpoint can flip pending -> official value and mark verified.
</requirements>

## Subtasks
- [x] 04.1 Add DB columns/Prisma schema changes for verification state.
- [x] 04.2 Implement controller endpoints to request verification and to confirm verification.
- [x] 04.3 Integrate with existing notification/queue provider or add an injectable verification service (mocked for tests).
- [x] 04.4 Add unit and integration tests for trigger and confirm flows.

## Implementation Details

### Relevant Files
- `apps/backend/src/prisma/schema.prisma` — add `emailVerified`, `phoneVerified`, `pendingEmail`, `pendingPhone` fields to `User` model and run migration.
- `apps/backend/src/modules/user/user.service.ts` — add helper methods to set pending values and finalize verification.
- `apps/backend/src/modules/user/user.controller.ts` — add new verification endpoints.
- `apps/backend/src/modules/notification/*` or similar — integrate with notification/email/SMS provider (injectable service).

### Dependent Files
- Migration files (Prisma) — schema migration required.
- `apps/backend/src/modules/auth/*` — confirm no auth regressions when adding endpoints.

### Related ADRs
- [ADR-001: Modular phased rollout for Profile screens](../adrs/adr-001.md)

## Deliverables
- Prisma schema updates and migration instructions.
- New verification endpoints (request & confirm) and service integration.
- Unit tests for controller/service logic and an integration test demonstrating pending->verified lifecycle.

## Tests
- Unit tests:
  - [x] calling `POST /profiles/:id/verify-email` enqueues a verification action and does not leak tokens.
  - [x] confirming verification updates `email` and `emailVerified`/`phoneVerified` appropriately.
- Integration tests:
  - [x] full flow: update profile with new email -> request verification -> confirm -> value marked verified and visible.
- Test coverage target: >=80% for modified modules.

## Success Criteria
- Verification endpoints implemented and tested.
- DB schema updated with verification fields and migrations documented.
- No tokens exposed in API responses; verification flow mockable for tests.
