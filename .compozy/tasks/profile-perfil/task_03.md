---
status: completed
title: "Backend: extend address support for labeled address types and primary address handling"
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 03: Backend: extend address support for labeled address types and primary address handling

## Overview
Provide labeled addresses (home, work, service) and a clear primary/default address marker. Ensure address CRUD supports labels and that changing the primary address updates previous primary flags accordingly.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Address model MUST include `label` and `isDefault` (primary) semantics.
- Creating/updating an address with `isDefault=true` MUST clear `isDefault` on the user's other addresses.
- Address CRUD endpoints MUST validate address payloads and preserve data integrity.
- Address management MUST remain separate from profile core updates (no `address` persistence inside `PATCH /user/:id`).
</requirements>

## Subtasks
- [x] 03.1 Add/confirm `label` and `isDefault` handling in `AddressService.create` and `update`.
- [x] 03.2 Add transactional logic to ensure single `isDefault` per user.
- [x] 03.3 Update address DTOs and entities to include label and isDefault validation.
- [x] 03.4 Add unit tests for create/update/delete and default-address switching.

## Implementation Details

### Relevant Files
- `apps/backend/src/prisma/schema.prisma` — Address model already contains `label` and `isDefault` fields; verify mapping.
- `apps/backend/src/modules/address/address.service.ts` — implement default switching logic when needed.
- `apps/backend/src/modules/address/dto/*` — extend DTOs to validate label and isDefault.
- `apps/backend/src/modules/address/address.service.spec.ts` — add tests.

### Dependent Files
- `apps/backend/src/modules/user/user.service.ts` — address behavior must stay separated from user update.
- `apps/backend/src/modules/address/address.controller.ts` — ensure API surface supports label and default flag.

### Related ADRs
- [ADR-001: Modular phased rollout for Profile screens](../adrs/adr-001.md)

## Deliverables
- Address service changes implementing label and single-default semantics.
- DTO validation updates for address payloads.
- Unit tests covering default switching and CRUD operations.

## Tests
- Unit tests:
  - [ ] create address with `isDefault=true` sets only that address as default for the user.
  - [ ] updating an address to `isDefault=true` clears previous default.
  - [ ] label values are accepted and persisted.
- Integration tests:
  - [ ] address creation and default switching in a transaction ensures data integrity.
- Test coverage target: >=80% for modified modules.

## Success Criteria
- Address CRUD works with labeled addresses and single primary address per user.
- Tests demonstrate default switching and payload validation.

## Validation Evidence
- Backend unit tests passed: `apps/backend/src/modules/address/address.service.spec.ts` (5/5).
- `AddressService.create` and `update` use Prisma transactions to clear existing defaults when `isDefault=true`.
