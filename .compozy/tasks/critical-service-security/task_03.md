---
status: pending
title: Enforce authenticated address ownership
type: backend
complexity: high
dependencies:
  - task_01
---

# Task 03: Enforce authenticated address ownership

## Overview

Make address management private to the authenticated customer. The current API ignores the frontend `userId` filter, allows access by arbitrary address ID, and persists only part of the validated address payload.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. Address listing MUST return only addresses owned by the authenticated user.
- 2. Address creation MUST associate the new address with the authenticated user without trusting a client-provided owner ID.
- 3. Address reads, updates, and deletes MUST reject access to records owned by another user.
- 4. Address persistence MUST retain the contextual fields required by the existing address journey, including label and coordinates.
- 5. Unauthorized requests MUST fail without revealing whether another user's address exists.
- 6. Because `_techspec.md` is missing, the exact private endpoint contract MUST be selected during implementation and reflected in frontend adaptation task `task_07`.
</requirements>

## Subtasks

- [ ] 03.1 Scope address list, create, read, update, and delete operations to the authenticated owner.
- [ ] 03.2 Stop using client-controlled ownership identifiers for address access.
- [ ] 03.3 Preserve the validated address fields required by profile and order journeys.
- [ ] 03.4 Standardize denial behavior for third-party address access.
- [ ] 03.5 Add ownership and persistence regression tests.

## Implementation Details

The current controller delegates arbitrary IDs directly to `AddressService`, while `AddressEntity.getValue()` drops fields used by the frontend. Keep the task focused on ownership and complete contextual persistence. Coordinate the external contract change with `task_07`.

### Relevant Files

- `apps/backend/src/modules/address/address.controller.ts` — Current address routes accept arbitrary IDs and an ignored `userId` query.
- `apps/backend/src/modules/address/address.service.ts` — Current persistence and unrestricted CRUD behavior.
- `apps/backend/src/modules/address/entities/address.entity.ts` — Current value extraction drops contextual address fields.
- `apps/backend/src/modules/address/dto/create-address.dto.ts` — Validated create payload.
- `apps/backend/src/modules/address/dto/update-address.dto.ts` — Update contract derived from create DTO.

### Dependent Files

- `apps/frontend/src/app/shared/service/address/address.ts` — Currently sends `userId` to list addresses.
- `apps/frontend/src/app/shared/service/address/address.model.ts` — Address contract includes contextual fields.
- `apps/frontend/src/app/modules/general/profile/address/address.ts` — Address profile consumer.
- `apps/frontend/src/app/modules/general/profile/address/components/address-form/address-form.ts` — Address creation source.

### Related ADRs

- [ADR-001: Protect the Complete Critical Marketplace Journey](adrs/adr-001.md) — Requires users to access only their own addresses.

## Deliverables

- Owner-scoped address list and CRUD behavior.
- Complete persistence of required address context.
- Consistent denial behavior for third-party address access.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for authenticated address ownership **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Listing addresses scopes the query to the authenticated user ID.
  - [ ] Creating an address associates the authenticated owner and ignores any client owner override.
  - [ ] Creating an address persists label, location, coordinates, and optional complement when provided.
  - [ ] Reading, updating, or deleting another user's address is denied.
  - [ ] Reading, updating, and deleting an owned address succeeds.
- Integration tests:
  - [ ] Anonymous address list request is rejected.
  - [ ] Authenticated user A cannot list user B addresses by changing a query parameter.
  - [ ] Authenticated user A cannot read, update, or delete user B address by changing the path ID.
  - [ ] Authenticated user creates an address and receives it in their own list with label and coordinates preserved.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Zero known cases of users viewing or changing third-party addresses.
- Address creation no longer accepts client-controlled ownership.
- Profile address data retains the fields required by the existing journey.
