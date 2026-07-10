---
status: pending
title: Remove deprecated public models and validate builds
type: refactor
complexity: medium
dependencies:
  - task_04
  - task_05
  - task_06
---

# Task 7: Remove deprecated public models and validate builds

## Overview
Complete the direct MVP replacement by removing leftover duplicated public auth/profile models and running the required build/type-check validation across all affected projects. This task confirms the shared contracts are the only public vocabulary for the selected auth/profile scope.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Deprecated local public auth/profile models selected in tasks 4, 5, and 6 MUST be removed or reduced to local-only implementation details.
- No remaining import SHOULD use replaced public model files for login/session/me, public profile, registration, or profile update contracts.
- Root and project build/type-check commands MUST validate backend, customer frontend, and backoffice compatibility with shared contracts.
- Any local view models left behind MUST be clearly app-specific and MUST NOT duplicate public shared contracts.
- Documentation or inline references SHOULD point maintainers to the shared contract module as the source of truth.
</requirements>

## Subtasks
- [ ] 7.1 Search for remaining imports of replaced customer auth/register/profile public models.
- [ ] 7.2 Search for remaining imports of replaced backoffice admin auth/session public models.
- [ ] 7.3 Remove obsolete files or narrow them to local-only implementation details.
- [ ] 7.4 Update any stale tests, mocks, or fixtures that still encode removed public fields.
- [ ] 7.5 Run backend, customer frontend, and backoffice build/type-check validation.
- [ ] 7.6 Record any intentional local view models that remain outside shared contracts.

## Implementation Details
Use the TechSpec `Testing Approach`, `Development Sequencing`, and `Known Risks` sections. This is not a broad cleanup task: only remove duplicated public auth/profile models from the MVP scope. Avoid migrating unrelated services, orders, payments, audit records, or provider operations.

### Relevant Files
- `apps/frontend/src/app/modules/auth/services/login/login.model.ts` — should no longer define public login contracts after task 4.
- `apps/frontend/src/app/shared/service/users/user-register.model.ts` — should no longer define duplicated public registration contracts after task 4.
- `apps/frontend/src/app/shared/service/users/user.model.ts` — should no longer define duplicated public profile contracts after task 5.
- `apps/frontend/src/app/shared/service/user-logged/user-logged.model.ts` — should no longer define duplicated public logged-user/session contracts after auth/profile migration.
- `apps/frontend/src/app/shared/enums/roles.enum.ts` — role vocabulary should be reconciled with shared contracts where public.
- `apps/backoffice/src/app/core/auth/admin-session.model.ts` — should no longer define duplicated public admin auth/session contracts after task 6.
- `libs/shared/src/index.ts` — final shared export surface to verify.

### Dependent Files
- `package.json` — root build/test scripts for final validation.
- `nx.json` — root target defaults and build/test behavior.
- `apps/backend/project.json` — backend build target.
- `apps/frontend/project.json` — customer frontend build target.
- `apps/backoffice/project.json` — backoffice build target.
- `apps/backend/package.json` — backend local build/test commands.
- `apps/frontend/package.json` — frontend local build/test commands.
- `apps/backoffice/package.json` — backoffice local build/test commands.

### Related ADRs
- [ADR-001: Prioritize Shared Domain Language for Authentication and Profile](adrs/adr-001.md) — Defines the MVP boundary for direct public model consolidation.
- [ADR-002: Use Pure Serializable TypeScript Contracts for Auth and Profile](adrs/adr-002.md) — Requires direct replacement and build/type-check validation.

## Deliverables
- Obsolete duplicated public auth/profile model definitions removed or narrowed.
- Remaining local view models documented by file purpose when they are intentionally app-specific.
- Backend, customer frontend, and backoffice build/type-check validation evidence.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for final cross-project contract validation **(REQUIRED)**.

## Tests
- Unit tests:
  - [ ] Search/type-check verifies no replaced public login/session/me contract imports remain outside shared contracts.
  - [ ] Search/type-check verifies no replaced public profile/register contract imports remain outside shared contracts.
  - [ ] Existing mocks and fixtures no longer include password/passwordHash in public auth/profile shapes.
- Integration tests:
  - [ ] Backend build/type-check passes after shared contract migration.
  - [ ] Customer frontend build/type-check passes after shared contract migration.
  - [ ] Backoffice build/type-check passes after shared contract migration.
  - [ ] Root build passes when it reliably covers the affected Nx projects.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing.
- Test coverage >=80%.
- Backend, customer frontend, and backoffice compile against shared auth/profile contracts.
- No duplicated public auth/profile model remains in the selected MVP scope.
- Shared contracts are the discoverable source of truth for login/session/me, public profile, registration, and profile update contracts.
