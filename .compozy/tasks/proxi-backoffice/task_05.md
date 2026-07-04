---
status: completed
title: Implement operator invitations and lifecycle
type: backend
complexity: high
dependencies:
    - task_02
    - task_03
    - task_04
---

# Task 05: Implement operator invitations and lifecycle

## Overview
Implement the Administrator-only workflow for listing, inviting, activating, deactivating, and changing the fixed role of Backoffice operators. Every sensitive change must invalidate stale sessions and commit with an audit record.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST implement all operator and activation endpoints from TechSpec "Administrative Users".
2. MUST store only invitation-token hashes and enforce expiry and single use.
3. MUST increment tokenVersion after role, password, activation, or deactivation changes.
4. MUST prevent deactivation of the final active Administrator.
5. MUST audit invitations, role changes, activation, deactivation, and password changes atomically.
6. SHOULD support safe invitation rotation after delivery failure or expiry.
</requirements>

## Subtasks
- [x] 05.1 Implement paginated administrative-user listing.
- [x] 05.2 Implement invitation creation, rotation, and activation.
- [x] 05.3 Implement role, activation, deactivation, and password changes.
- [x] 05.4 Integrate invitation delivery with the available notification boundary.
- [x] 05.5 Enforce final-Administrator and stale-token protections.
- [x] 05.6 Add service, controller, and database integration coverage.

## Verification Note
- 2026-07-02: Implementation, build, admin unit coverage, and relevant admin e2e checks passed. Overall task status remains `pending` because lint is blocked before source analysis by the pre-existing unresolved `typescript-eslint` import in `apps/backend/eslint.config.mjs`.

## Implementation Details
See TechSpec "Administrative Users" and "Invitation Email". The repository has a mailer dependency but no established invitation service, so keep delivery behind a narrow interface.

### Relevant Files
- `apps/backend/src/modules/auth/commands/forgot-password/forgot-password.handle.ts` — token-like account workflow precedent.
- `apps/backend/src/shared/services/pagination/pagination.service.ts` — existing pagination response shape.
- `apps/backend/src/modules/user/user.service.ts` — bcrypt and lifecycle conventions.

### Dependent Files
- `apps/backend/src/app.module.ts` — administrative module registration.
- `config/backend.env` — invitation URL and mail configuration.

### Related ADRs
- [ADR-003: Dedicated Administrative Identities With Shared JWT Secret](adrs/adr-003.md)
- [ADR-004: Explicit Provider Commands With Transactional Audit](adrs/adr-004.md)

## Deliverables
- Operator lifecycle API and validation DTOs.
- Hashed, expiring, rotatable invitation workflow.
- Audited role and account-state changes.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for operator lifecycle **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Expired, reused, and superseded invitation tokens are rejected.
  - [x] Role and status changes increment tokenVersion.
  - [x] Final active Administrator cannot be deactivated.
- Integration tests:
  - [x] Invitation activation enables login exactly once.
  - [x] Deactivation invalidates an already issued token immediately.
  - [x] Every successful lifecycle change has one matching audit record.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- 100% of active operators have exactly one fixed role.
- No raw invitation token is persisted or returned after activation.
