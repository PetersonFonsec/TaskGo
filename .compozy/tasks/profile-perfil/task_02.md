---
status: completed
title: "Backend: support core profile field updates (display name, photo, phone, email) and return profile with addresses"
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 02: Backend: support core profile field updates (display name, photo, phone, email) and return profile with addresses

## Overview
Enable the backend to accept partial updates for the core profile fields (name, email, phone, photoUrl, password -> passwordHash) and ensure profile reads return the user together with their addresses. This allows the frontend to persist and display the shared core profile in the Profile screens.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- PATCH /user/:id MUST accept and update only: `name`, `email`, `phone`, `photoUrl`, and `password` (stored as `passwordHash`).
- Unsupported payload keys (e.g., `address`, `bio`, `services`) MUST be ignored and not persisted.
- Updated `email` and `phone` MUST be validated before the DB update.
- GET /user/:id MUST return the user record including `addresses` relation.
- Existing user update behaviors MUST remain backward compatible for supported fields.
</requirements>

## Subtasks
- [x] 02.1 Ensure `UserService.update` maps only the allowed fields and validates `email` and `phone`.
- [x] 02.2 Ensure `password` is hashed and set to `passwordHash` when provided.
- [x] 02.3 Include `addresses` in the `findOne`/GET response for user profiles.
- [x] 02.4 Add unit tests validating accepted fields, ignored unsupported keys, and validation behavior.

## Implementation Details
Modify the existing user update and read flow to guarantee a profile-safe surface for the frontend.

### Relevant Files
- `apps/backend/src/modules/user/user.service.ts` — update mapping and ensure `findOne` includes addresses.
- `apps/backend/src/modules/user/user.controller.ts` — PATCH and GET endpoints already present; confirm payload DTO usage.
- `apps/backend/src/modules/user/dto/update-user.dto.ts` — ensure it reflects allowed fields (PartialType currently used).
- `apps/backend/src/prisma/schema.prisma` — User and Address models used for returns.

### Dependent Files
- `apps/backend/src/modules/user/user.service.spec.ts` — update/add unit tests.
- `apps/backend/src/modules/address/*` — read behavior for addresses may be relied upon by profile GET.

### Related ADRs
- [ADR-001: Modular phased rollout for Profile screens](../adrs/adr-001.md)

## Deliverables
- Backend code changes ensuring `PATCH /user/:id` only persists allowed fields and validation is applied.
- `GET /user/:id` returns user with `addresses` relation.
- Unit tests demonstrating accepted/ignored fields and validation behavior (>=80% coverage for modified units).

## Tests
- Unit tests:
  - [ ] supported fields are passed to `prisma.user.update` and mapped correctly (including `passwordHash`).
  - [ ] unsupported fields are ignored.
  - [ ] `email` and `phone` validations reject invalid values before DB update.
- Integration tests:
  - [ ] PATCH then GET returns the updated fields and includes addresses when present.
- Test coverage target: >=80% for modified modules.

## Success Criteria
- All unit and integration tests passing.
- `PATCH /user/:id` updates only allowed fields and ignores unsupported keys.
- `GET /user/:id` returns addresses alongside user profile.

## Validation Evidence
- Backend unit tests passed: `apps/backend/src/modules/user/user.service.spec.ts` (4/4).
- `GET /user/:id` query handler includes `addresses` in the Prisma include list.
