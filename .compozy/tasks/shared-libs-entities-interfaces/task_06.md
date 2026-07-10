---
status: completed
title: Replace backoffice auth/session models
type: frontend
complexity: medium
dependencies:
  - task_01
  - task_03
---

# Task 6: Replace backoffice auth/session models

## Overview
Replace backoffice administrative auth/session public models with the shared admin auth contracts. This task keeps token storage, guards, and navigation behavior intact while removing duplicated admin role/operator/session contract definitions from the backoffice app.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Backoffice login requests, login responses, me responses, admin operator, and admin session types MUST come from shared contracts.
- Backoffice token payload decoding types MAY remain local because token payload internals are not public shared contracts.
- Existing admin session storage keys, guard behavior, and navigation role behavior MUST remain unchanged.
- Feature models that reference admin roles SHOULD import the shared admin role contract instead of the local session model.
- The local `admin-session.model.ts` file MUST be removed, narrowed to local-only token internals, or converted to re-export-free implementation details.
</requirements>

## Subtasks
- [x] 6.1 Replace admin auth service model imports with shared admin auth contracts.
- [x] 6.2 Replace admin session storage model imports with shared admin session/operator contracts.
- [x] 6.3 Update guards, navigation, operators, providers, and audit models to use shared admin role/operator contracts where public.
- [x] 6.4 Keep token payload decoding local and separate from shared public contracts.
- [x] 6.5 Update backoffice auth/session tests for shared contracts and unchanged behavior.
- [x] 6.6 Remove or deprecate replaced admin session model exports.

## Implementation Details
Use the TechSpec `Data Models` and `Known Risks` sections. Treat `AdminTokenPayload` as a local implementation detail even if it remains near auth storage code. Migrate public admin role/operator/session imports across backoffice features that currently depend on `@app/core/auth/admin-session.model`.

### Relevant Files
- `apps/backoffice/src/app/core/auth/admin-session.model.ts` — duplicated admin public contract definitions to replace.
- `apps/backoffice/src/app/core/auth/admin-auth.service.ts` — consumes admin login/me contracts.
- `apps/backoffice/src/app/core/auth/admin-session-storage.service.ts` — persists admin session/operator identity.
- `apps/backoffice/src/app/core/auth/admin-auth.guards.ts` — checks session and admin role contracts.
- `apps/backoffice/src/app/core/navigation/admin-navigation.ts` — uses admin roles for navigation.
- `apps/backoffice/src/app/features/operators/operator-admin.models.ts` — uses admin role/operator concepts.
- `apps/backoffice/src/app/features/providers/provider-admin.models.ts` — uses admin role concepts.
- `apps/backoffice/src/app/features/audit/audit-log.models.ts` — uses admin role concepts.

### Dependent Files
- `apps/backoffice/src/app/core/auth/admin-auth.service.spec.ts` — verifies login/session/me behavior.
- `apps/backoffice/src/app/core/auth/admin-session-storage.service.spec.ts` — verifies persisted session restore behavior.
- `apps/backoffice/src/app/core/auth/admin-auth.guards.spec.ts` — verifies guard behavior.
- `apps/backoffice/src/app/core/navigation/admin-navigation.spec.ts` — verifies navigation role filtering.
- `apps/backoffice/src/app/features/operators/operator-admin.models.spec.ts` — verifies role model helpers.

### Related ADRs
- [ADR-001: Prioritize Shared Domain Language for Authentication and Profile](adrs/adr-001.md) — Includes backoffice auth/session language in MVP scope.
- [ADR-002: Use Pure Serializable TypeScript Contracts for Auth and Profile](adrs/adr-002.md) — Requires direct replacement of selected local admin public models.

## Deliverables
- Backoffice public admin auth/session imports use shared contracts.
- Token payload decoding remains local and separate from shared contracts.
- Replaced admin session model definitions removed, narrowed, or converted to local-only internals.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for backoffice auth/session contract usage **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] `AdminAuthService.login` maps shared admin login response into stored session state.
  - [x] `AdminAuthService.refreshCurrentOperator` accepts the shared admin me response wrapper.
  - [x] `AdminSessionStorageService.restore` restores a session typed with shared admin operator/session contracts.
  - [x] Guards and navigation continue accepting shared admin role values.
- Integration tests:
  - [x] Backoffice auth HTTP test flushes a shared admin session response and verifies localStorage token identity behavior.
  - [x] Backoffice session restore test verifies ordinary marketplace tokens are still rejected.
  - [x] Angular type-check catches remaining public imports from the replaced admin session model.
- Test coverage target: >=80%
- All tests must pass

### Verification Notes
- `npm run test -- --include=src/app/core/auth/admin-auth.service.spec.ts --include=src/app/core/auth/admin-session-storage.service.spec.ts --include=src/app/core/auth/admin-auth.guards.spec.ts --include=src/app/core/navigation/admin-navigation.spec.ts --include=src/app/features/operators/operator-admin.models.spec.ts --watch=false --browsers=ChromeHeadless` passed in `apps/backoffice` with 21 tests and coverage above 80%: statements 96.33%, branches 82.22%, functions 90%, lines 97.02%.
- `npx tsc -p tsconfig.spec.json --noEmit` passed in `apps/backoffice`.
- `npm run build` passed in `apps/backoffice`.
- `npm run build -- --projects=backend,frontend,backoffice` passed from the workspace root.
- `compozy tasks validate --name shared-libs-entities-interfaces` passed.
- `git diff --check` passed.
- `rg "Admin(LoginRequest|LoginResponse|MeResponse)|admin-session.model" apps/backoffice/src/app -n` shows only shared `AdminAuthSession`/`AdminMeResponse` usage and local `AdminSession`/`AdminTokenPayload` imports from `admin-session.model.ts`.
- The root/frontend builds still emit existing frontend budget/CommonJS warnings and an SSR-time `localhost:3000/categories` fetch warning, but exit successfully.

## Success Criteria
- Task-specific tests passing.
- Test coverage >=80% for the focused backoffice auth/session surface.
- Backoffice auth/session code compiles against shared contracts.
- Admin token internals remain local.
- No duplicated public admin auth/session model remains in backoffice.
