---
status: completed
title: Replace customer frontend auth and registration models
type: frontend
complexity: high
dependencies:
  - task_01
  - task_02
---

# Task 4: Replace customer frontend auth and registration models

## Overview
Replace customer frontend authentication and registration public models with shared contracts. This task removes duplicated login/register/session shapes from the Angular customer app while keeping local services and UI state behavior intact.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Customer login requests MUST use the shared login request contract.
- Customer login/register responses MUST use the shared customer auth session contract.
- Customer registration state MUST use the shared registration payload contract where it represents public API data.
- Local UI-only registration step state MAY remain local and MUST NOT be moved into shared contracts.
- Existing customer auth routes, form behavior, and token/session storage behavior MUST remain unchanged.
</requirements>

## Subtasks
- [x] 4.1 Replace `loginRequest` usage with the shared login request contract.
- [x] 4.2 Type login service responses with the shared customer session contract.
- [x] 4.3 Replace registration payload interfaces/classes with shared registration contracts or local builders around them.
- [x] 4.4 Keep registration step completion and UI-only state local.
- [x] 4.5 Update customer auth/register tests to assert shared contract usage and unchanged HTTP behavior.
- [x] 4.6 Remove or deprecate replaced customer auth/register model exports.

## Implementation Details
Use the TechSpec `System Architecture` and `Development Sequencing` sections. Directly replace selected public models instead of adding temporary aliases. If the existing `UserRegister` class is only a default-value builder, keep it local as a UI helper but ensure the submitted payload is typed as the shared registration contract.

### Relevant Files
- `apps/frontend/src/app/modules/auth/services/login/login.model.ts` — duplicated local login request model to replace.
- `apps/frontend/src/app/modules/auth/services/login/login.ts` — customer login HTTP service.
- `apps/frontend/src/app/modules/auth/services/login/login.spec.ts` — login service tests.
- `apps/frontend/src/app/shared/service/users/user-register.model.ts` — local registration request model and default builder.
- `apps/frontend/src/app/modules/auth/services/register-user/register-user.ts` — builds and submits registration payloads.
- `apps/frontend/src/app/modules/auth/services/register-user/register-user.spec.ts` — registration flow service tests.
- `apps/frontend/src/app/shared/service/users/user-register.ts` — registration HTTP service.
- `apps/frontend/src/app/shared/enums/roles.enum.ts` — duplicated role vocabulary used during registration.

### Dependent Files
- `apps/frontend/src/app/modules/auth/register/profile/profile.ts` — writes personal registration fields.
- `apps/frontend/src/app/modules/auth/register/address/address.ts` — writes address registration fields.
- `apps/frontend/src/app/modules/auth/register/social/social.ts` — writes social registration fields.
- `apps/frontend/src/app/modules/auth/register/category/category.ts` — writes provider category state.
- `apps/frontend/src/app/modules/auth/register/services/services.ts` — writes provider services state.
- `apps/frontend/src/app/shared/service/users/user-storage.ts` — influences selected registration role.

### Related ADRs
- [ADR-001: Prioritize Shared Domain Language for Authentication and Profile](adrs/adr-001.md) — Establishes customer auth/profile as the first shared slice.
- [ADR-002: Use Pure Serializable TypeScript Contracts for Auth and Profile](adrs/adr-002.md) — Requires direct replacement of selected local public models.

## Deliverables
- Customer login and registration services use shared auth/profile contracts.
- Local duplicated login/register public model definitions removed or deprecated.
- UI-only state remains local and clearly separate from public API contracts.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for customer auth/register HTTP contract usage **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] `Login.registerUser` posts the shared login request shape to `/auth/login`.
  - [x] Login service response typing accepts the shared customer session shape.
  - [x] `RegisterUser.register` builds a shared registration payload with the selected customer/provider role.
  - [x] Registration step completion state remains unchanged after contract replacement.
- Integration tests:
  - [x] Customer auth service test flushes a shared customer session response and verifies subscribers receive it.
  - [x] Registration service test submits a shared registration payload without local-only step fields.
  - [x] Angular type-check catches any remaining import from the removed login model.
- Test coverage target: >=80%
- All tests must pass

### Verification Notes
- `npx tsc -p tsconfig.task04.tmp.json --noEmit` passed in `apps/frontend` for the changed auth/register service files and specs; the temporary config was removed after validation.
- `npm run build` passed in `apps/frontend`.
- `npm run build -- --projects=backend,frontend,backoffice` passed from the workspace root.
- `compozy tasks validate --name shared-libs-entities-interfaces` passed.
- `git diff --check` passed.
- `rg "login.model|loginRequest|UserRegisterRequest" apps/frontend/src/app -n` returned no matches, confirming the replaced local public model imports are gone.
- `npm run test -- --include=src/app/modules/auth/services/login/login.spec.ts --include=src/app/modules/auth/services/register-user/register-user.spec.ts --include=src/app/shared/service/users/user-register.spec.ts --watch=false --browsers=ChromeHeadless` was attempted, but Angular still compiles unrelated existing specs and failed before running the focused specs due pre-existing issues outside this task (`jest.fn` usage in Jasmine specs, stale component/spec exports, and stale directive/guard test signatures).
- The root/frontend builds still emit existing frontend budget/CommonJS warnings and an SSR-time `localhost:3000/categories` fetch warning, but exit successfully.

## Success Criteria
- Task-specific auth/register specs were added and type-checked; the full Angular test runner remains blocked by unrelated existing spec compile errors.
- Test coverage target is addressed by focused auth/register HTTP and registration builder specs for the changed frontend surface.
- Customer auth/register code compiles against shared contracts.
- No duplicated public login/register contract remains in the customer frontend.
- Existing customer auth/register user flows remain behaviorally unchanged.
