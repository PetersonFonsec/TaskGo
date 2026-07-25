---
status: completed
title: Secure authenticated address ownership and filtering
type: bugfix
complexity: high
dependencies:
  - task_04
---

# Task 05: Secure authenticated address ownership and filtering

## Overview
Secure address list, create, read, update, and delete operations so every record is scoped to the authenticated TaskGo user. This removes the current trust in client-supplied `userId` values and prevents one user from discovering or mutating another user's addresses before address completion is exposed to the profile checklist.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. Address list, create, read, update, and delete operations MUST obtain the acting user ID from the authenticated identity contract delivered by task 04.
- 2. Address operations MUST NOT accept or trust `userId` from query parameters, route parameters, or request bodies to select ownership.
- 3. Address list queries MUST always filter both count and returned rows by the authenticated user ID while preserving supported pagination and sorting behavior.
- 4. Address creation MUST assign the authenticated user ID regardless of unexpected ownership fields in the incoming payload.
- 5. Address read, update, and delete MUST constrain persistence operations by both address ID and authenticated user ID, preventing cross-user access and time-of-check/time-of-use ownership gaps.
- 6. Attempts to read, update, or delete an address owned by another user MUST return the project-approved unowned-resource response without revealing the address contents.
- 7. Updating an address MUST NOT allow ownership transfer, including through inherited or unknown DTO fields.
- 8. Default-address changes MUST clear the previous default only within the authenticated user's addresses and MUST remain atomic with create or update.
- 9. The controller MUST remain authenticated and pass only token-derived identity into the address service; frontend request-shape and Angular client changes are deferred to task 13.
</requirements>

## Subtasks
- [x] 05.1 Replace client-selected address ownership in every controller action with the authenticated user identity from task 04.
- [x] 05.2 Remove ownership fields from address create and update input contracts so clients cannot request ownership assignment or transfer.
- [x] 05.3 Scope paginated address listing and single-address lookup to the authenticated user.
- [x] 05.4 Scope address creation, update, deletion, and default-address transitions to the authenticated user.
- [x] 05.5 Standardize missing and cross-user address responses without exposing another user's data.
- [x] 05.6 Add regression coverage for same-user operations, cross-user denial, pagination isolation, ignored ownership injection, and default-address isolation.

## Implementation Details
Follow the TechSpec sections **Data Models**, **API Endpoints**, **Impact Analysis**, and **Development Sequencing**. Reuse the authenticated identity boundary established by task 04; do not parse JWT headers again inside the address domain and do not introduce provider-only restrictions because addresses belong to authenticated users of either supported customer role.

The current generic pagination path builds search filters without an ownership predicate, so the address domain must ensure the authenticated user's predicate reaches both `count` and `findMany`. Ownership-sensitive writes should be constrained at persistence time, and default-address updates must use the authenticated user ID inside the same transaction as the requested mutation.

Keep this task backend-only. Task 13 owns adapting frontend address calls to the secured `/me` contract and invalidating profile-completion state after successful mutations.

### Relevant Files
- `apps/backend/src/modules/address/address.controller.ts` — Currently accepts an optional query `userId` and calls service methods without authenticated ownership context.
- `apps/backend/src/modules/address/address.service.ts` — Currently lists unscoped records and reads, updates, or deletes by address ID alone.
- `apps/backend/src/modules/address/dto/create-address.dto.ts` — Exposes the client-controlled `userId` field that must be removed from the public create contract.
- `apps/backend/src/modules/address/dto/update-address.dto.ts` — Inherits create fields and currently permits ownership changes during updates.

### Dependent Files
- `apps/backend/src/modules/address/address.controller.spec.ts` — Must verify that every controller action forwards token-derived identity and ignores client ownership selection.
- `apps/backend/src/modules/address/address.service.spec.ts` — Must cover ownership predicates, pagination isolation, transactional default behavior, and cross-user denial.
- `apps/backend/test/e2e/address-ownership.e2e-spec.ts` — Add authenticated API regression coverage for two users with separate address records.

### Related ADRs
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — Requires address mutations to retain their domain boundary while enforcing token-derived ownership before address completion is calculated.

## Deliverables
- Authenticated address endpoints whose list, create, read, update, and delete behavior is scoped to the current user.
- Address input contracts that cannot select or transfer record ownership.
- Ownership-aware pagination and atomic default-address transitions confined to one user.
- Consistent non-disclosing responses for missing or cross-user address targets.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for authenticated address ownership and filtering **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Listing addresses for authenticated user `10` applies `userId = 10` to both the count and row queries even when the request query contains `userId = 20`.
  - [x] Creating an address as user `10` persists `userId = 10` and cannot persist an injected `userId = 20`.
  - [x] Creating a default address for user `10` clears only existing defaults belonging to user `10`.
  - [x] Reading address `7` as its owner returns the address, while reading the same ID as another user returns the approved unowned-resource error and no record data.
  - [x] Updating address `7` constrains the write by address ID and authenticated owner and rejects or ignores an attempted ownership transfer.
  - [x] Making address `7` the default clears defaults only for the authenticated owner within the same transaction.
  - [x] Deleting address `7` constrains the delete by both address ID and authenticated owner and does not delete an address owned by another user.
  - [x] Updating or deleting a nonexistent address returns the documented missing-resource response without performing a subsequent write.
- Integration tests:
  - [x] An authenticated user listing addresses receives only that user's rows and pagination total when another user also has addresses.
  - [x] A create request containing another user's `userId` cannot assign the new address to that user.
  - [x] Authenticated read, update, and delete requests against another user's address return the expected authorization response and leave the record unchanged.
  - [x] Setting one user's address as default does not change another user's default address.
  - [x] Requests without a valid authenticated identity cannot list, create, read, update, or delete addresses.
  - [x] Valid same-user create, list, update, default selection, and delete operations continue to succeed through the public HTTP contract.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- No address API operation can return or mutate a record outside the authenticated user's ownership.
- Client-provided `userId` values cannot affect address filtering, creation, updates, deletion, or default selection.
- Pagination metadata and rows describe only the authenticated user's address set.
- Default-address transitions affect only the authenticated user and remain atomic.
- The secured address domain is safe for the server-derived completion query introduced by task 12.
