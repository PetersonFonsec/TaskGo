---
status: completed
title: Enforce administrative authorization and fixed roles
type: backend
complexity: high
dependencies:
    - task_02
---

# Task 03: Enforce administrative authorization and fixed roles

## Overview
Create deny-by-default guards and role metadata for all `/admin/*` endpoints. Authorization must validate the current database record on every request instead of trusting token role claims alone.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST reject ordinary, malformed, expired, stale-version, and inactive administrative tokens.
2. MUST attach a validated AdminActor request context for downstream auditing.
3. MUST enforce the fixed four-role matrix from TechSpec "Permission Matrix".
4. MUST default to denial when administrative role metadata is absent or invalid.
5. MUST leave public and marketplace guards behaviorally unchanged.
</requirements>

## Subtasks
- [ ] 03.1 Define administrative request identity and role metadata contracts.
- [ ] 03.2 Implement the administrative authentication guard.
- [ ] 03.3 Implement fixed-role authorization enforcement.
- [ ] 03.4 Apply the guards at the administrative module boundary.
- [ ] 03.5 Add a full negative authorization matrix to tests.

## Implementation Details
See TechSpec "Administrative JWT" and "Permission Matrix". Do not extend the currently permissive shared RolesGuard for this privileged boundary.

### Relevant Files
- `apps/backend/src/modules/auth/auth.guard.ts` — global authentication behavior to preserve.
- `apps/backend/src/shared/guards/roles/roles.guard.ts` — currently permissive implementation.
- `apps/backend/src/shared/decorators/public.decorator.ts` — route metadata pattern.

### Dependent Files
- `apps/backend/src/app.module.ts` — global guard ordering.
- `apps/backend/src/shared/interfaces/user-token.ts` — marketplace identity contract that must stay separate.

### Related ADRs
- [ADR-003: Dedicated Administrative Identities With Shared JWT Secret](adrs/adr-003.md)
- [ADR-005: Comprehensive Backoffice Verification Gate](adrs/adr-005.md)

## Deliverables
- Administrative auth and role guards plus decorators.
- Validated AdminActor request context.
- Complete endpoint-role test matrix.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for administrative boundary isolation **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] tokenKind other than admin is rejected.
  - [ ] Token version and stored role mismatches are rejected.
  - [ ] Each fixed role receives only its declared capabilities.
- Integration tests:
  - [ ] Ordinary user JWT receives 401 on every administrative route family.
  - [ ] Inactive administrative user receives 403 using a previously valid token.
  - [ ] Missing role metadata cannot accidentally grant access.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Zero matrix cases grant an undeclared capability.
- Existing customer and provider E2E authentication remains green.

