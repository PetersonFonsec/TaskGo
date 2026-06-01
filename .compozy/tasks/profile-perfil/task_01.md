---
status: completed
title: "Backend: extend user profile update flow for core profile fields"
type: backend
complexity: medium
dependencies: []
---

# Task 01: Backend: extend user profile update flow for core profile fields

## Overview

Ensure the existing `PATCH /user/:id` path supports profile updates for the fields used by the profile screens. This task focuses on the backend user update flow, removing invalid payload keys, validating updated contact fields, and keeping address management separate.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- `PATCH /user/:id` must update core user profile fields: `name`, `email`, `phone`, `photoUrl`, and `password` (mapped to `passwordHash`).
- The update flow must ignore unsupported payload fields such as `address`, `bio`, and `services`.
- Updated `email` and `phone` values must be validated before the DB update.
- Existing `user.update` behavior must continue to work for supported user fields.
</requirements>

## Subtasks
- [x] 01.1 Add explicit profile-safe field mapping in `UserService.update`.
- [x] 01.2 Validate `email` and `phone` values during update.
- [x] 01.3 Hash `password` when provided and map it to `passwordHash`.
- [x] 01.4 Add unit tests covering supported updates and ignored unsupported keys.

## Implementation Details

- Modify `apps/backend/src/modules/user/user.service.ts`.
- Add or update `apps/backend/src/modules/user/user.service.spec.ts`.

### Relevant Files
- `apps/backend/src/modules/user/user.service.ts`
- `apps/backend/src/modules/user/user.service.spec.ts`
- `apps/backend/src/modules/user/dto/update-user.dto.ts`
- `apps/backend/src/modules/user/user.controller.ts`

## Deliverables
- Backend code updates that safely handle profile update payloads.
- Tests verifying the update data shape and validation behavior.

## Tests
- Unit tests:
  - [x] supported fields are passed to `prisma.user.update`.
  - [x] unsupported fields are ignored.
  - [x] invalid phone values fail validation.

## Validation Evidence
- Unit tests passed: `apps/backend/src/modules/user/user.service.spec.ts` (4/4) on 2026-06-01.

## Success Criteria
- `UserService.update` applies only valid user fields.
- Tests pass with the new update validation behavior.
