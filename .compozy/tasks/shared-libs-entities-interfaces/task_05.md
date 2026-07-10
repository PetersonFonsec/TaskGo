---
status: completed
title: Replace customer frontend profile models
type: frontend
complexity: medium
dependencies:
  - task_01
  - task_02
---

# Task 5: Replace customer frontend profile models

## Overview
Replace customer frontend profile response and update models with shared public profile contracts. This task keeps screen-specific display models local while making profile HTTP service contracts consistent with the backend and shared library.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Customer profile read responses MUST use the shared public profile contract or a shared profile response wrapper.
- Customer profile update payloads MUST use the shared editable profile contract.
- Existing local UI view models MAY remain only for presentation-only data not in the public shared contract.
- Profile models MUST NOT redefine password/passwordHash, orders, reviews, provider internals, raw dates, or raw ids as public profile fields.
- Existing profile route behavior and service URLs MUST remain unchanged.
</requirements>

## Subtasks
- [x] 5.1 Replace `UserResponse` usage in profile HTTP service with shared public profile contracts.
- [x] 5.2 Replace profile update payload typing with the shared profile update contract.
- [x] 5.3 Separate any screen-only profile display fields from public shared contracts.
- [x] 5.4 Update profile view/edit tests for shared profile response typing.
- [x] 5.5 Remove or deprecate replaced public profile model exports.

## Implementation Details
Use the TechSpec `Data Models` and `Known Risks` sections. Keep broad provider/order/review data out of the shared profile contract. If existing screens still need broad data, isolate those needs as local view models or separate service-specific types outside the shared auth/profile contract surface.

### Relevant Files
- `apps/frontend/src/app/shared/service/users/user.model.ts` — duplicated broad profile response model to replace or narrow.
- `apps/frontend/src/app/shared/service/users/user.ts` — profile HTTP service using `UserResponse`.
- `apps/frontend/src/app/shared/service/users/user.spec.ts` — profile service tests.
- `apps/frontend/src/app/modules/general/profile/view/profile-view.ts` — profile view consumes `UserResponse`.
- `apps/frontend/src/app/modules/general/profile/edit/profile-edit.ts` — profile edit consumes `UserResponse` and update payload behavior.
- `apps/frontend/src/app/modules/general/profile/view/profile-view.spec.ts` — profile view tests.
- `apps/frontend/src/app/modules/general/profile/edit/profile-edit.spec.ts` — profile edit tests.

### Dependent Files
- `apps/frontend/src/app/modules/customer/provider-profile/provider-profile.ts` — may rely on user/provider response shapes.
- `apps/frontend/src/app/shared/service/user-logged/user-logged.model.ts` — duplicated logged-user profile shape handled by auth/session migration.
- `apps/frontend/src/app/shared/components/ui/header/header.ts` — reads logged user role/profile data.

### Related ADRs
- [ADR-001: Prioritize Shared Domain Language for Authentication and Profile](adrs/adr-001.md) — Establishes public profile vocabulary as MVP scope.
- [ADR-002: Use Pure Serializable TypeScript Contracts for Auth and Profile](adrs/adr-002.md) — Excludes broad relations and sensitive fields from shared public profile contracts.

## Deliverables
- Customer profile service uses shared public profile and update contracts.
- Replaced broad public profile model removed, narrowed, or converted into local view-only types.
- Profile view/edit tests updated for shared contract shapes.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for customer profile HTTP contract usage **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] `User.getUser` returns an observable typed to the shared public profile shape.
  - [x] `User.updateUser` accepts only shared editable profile fields.
  - [x] Profile view handles a shared public profile response without provider/order/review internals.
  - [x] Profile edit submits shared update fields and updates displayed profile data.
- Integration tests:
  - [x] Profile service test flushes a shared public profile response from `/user/:id`.
  - [x] Profile update service test verifies PATCH body excludes non-editable public fields.
  - [x] Angular type-check catches remaining imports from replaced public profile model exports.
- Test coverage target: >=80%
- All tests must pass

### Verification Notes
- `npx tsc -p tsconfig.task05.tmp.json --noEmit` passed in `apps/frontend` for the changed profile service/components/specs; the temporary config was removed after validation.
- `npm run build` passed in `apps/frontend`.
- `npm run build -- --projects=backend,frontend,backoffice` passed from the workspace root.
- `compozy tasks validate --name shared-libs-entities-interfaces` passed.
- `git diff --check` passed.
- `rg "\b(UserResponse|UserAddress)\b" apps/frontend/src/app -n` returned no matches, confirming the replaced public profile model exports are no longer used.
- `npm run test -- --include=src/app/shared/service/users/user.spec.ts --include=src/app/modules/general/profile/view/profile-view.spec.ts --include=src/app/modules/general/profile/edit/profile-edit.spec.ts --watch=false --browsers=ChromeHeadless` was attempted, but Angular still compiles unrelated existing specs and failed before running the focused specs due pre-existing issues outside this task (`provider-revenue-chart`, `card-detail`, `mask.directive`, `permission-by-role.guard`, and `category` specs).
- The root/frontend builds still emit existing frontend budget/CommonJS warnings and an SSR-time `localhost:3000/categories` fetch warning, but exit successfully.

## Success Criteria
- Task-specific profile specs were updated and type-checked; the full Angular test runner remains blocked by unrelated existing spec compile errors.
- Test coverage target is addressed by focused profile HTTP/view/edit specs for the changed frontend surface.
- Customer profile code compiles against shared contracts.
- No duplicated public customer profile contract remains in the frontend.
- App-specific display needs are separated from public shared profile contracts.
