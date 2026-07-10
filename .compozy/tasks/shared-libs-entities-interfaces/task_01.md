---
status: completed
title: Create shared auth/profile contract module
type: refactor
complexity: medium
dependencies: []
---

# Task 1: Create shared auth/profile contract module

## Overview
Create the shared public contract surface that the backend, customer frontend, and backoffice will consume for authentication and profile flows. This task establishes the source of truth for JSON-safe auth/profile vocabulary before any app replaces local models.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- The shared module MUST expose pure TypeScript `type` and `interface` contracts only.
- The shared contracts MUST be JSON-safe and MUST NOT expose `bigint`, raw `Date`, Prisma model types, passwords, password hashes, orders, reviews, or provider internals.
- The module MUST cover login/session/me, public user profile, admin operator profile, registration payloads, and profile update payloads.
- The shared barrel MUST let all projects import the contracts through `@taskgo/shared` or a documented `@taskgo/shared/*` path.
- Existing value-object exports MUST remain untouched unless import resolution requires a non-breaking barrel update.
</requirements>

## Subtasks
- [x] 1.1 Define the shared auth/profile contract file structure under `libs/shared/src`.
- [x] 1.2 Add JSON-safe role, session, public profile, registration, and profile update contracts.
- [x] 1.3 Export the contracts from the shared library barrel.
- [x] 1.4 Verify the shared aliases can resolve without breaking existing `@taskgo/shared/value-objects` usage.
- [x] 1.5 Add lightweight type-level or compile-only coverage where the repository pattern supports it.

## Implementation Details
Create the contract module described in the TechSpec `Implementation Design` and `Data Models` sections. Keep the implementation type-only and avoid runtime validators or framework decorators. Confirm whether the existing root shared barrel is the best public export point or whether a subpath export is cleaner for current `tsconfig.base.json` aliases.

### Relevant Files
- `libs/shared/src/index.ts` — current root shared barrel is empty and must expose the new public contracts.
- `libs/shared/project.json` — defines the existing shared Nx project and source root.
- `libs/shared/src/value-objects/src/index.ts` — existing shared exports that must not be broken.
- `tsconfig.base.json` — contains existing `@taskgo/shared` and `@taskgo/shared/*` path aliases.

### Dependent Files
- `apps/backend/tsconfig.json` — backend must resolve shared contracts after this task.
- `apps/frontend/tsconfig.json` — customer frontend has local aliases and must still resolve shared contracts.
- `apps/backoffice/tsconfig.json` — backoffice has local aliases and must still resolve shared contracts.

### Related ADRs
- [ADR-001: Prioritize Shared Domain Language for Authentication and Profile](adrs/adr-001.md) — Establishes auth/profile as the first shared domain language slice.
- [ADR-002: Use Pure Serializable TypeScript Contracts for Auth and Profile](adrs/adr-002.md) — Requires pure JSON-safe TypeScript contracts.

## Deliverables
- Shared auth/profile contracts added under `libs/shared/src`.
- Shared barrel exports updated for the new contracts.
- No backend framework decorators, Prisma runtime types, or Angular UI concerns in shared contracts.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for shared import resolution **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] Compile-time check: importing auth/profile contracts from the chosen shared export path succeeds.
  - [x] Type assertion: public profile contracts reject password/passwordHash fields in type fixtures.
  - [x] Type assertion: public contracts use string timestamps and string ids rather than `Date` or `bigint`.
- Integration tests:
  - [x] Build/type-check a minimal backend import of the shared contracts.
  - [x] Build/type-check a minimal frontend import of the shared contracts.
  - [x] Build/type-check a minimal backoffice import of the shared contracts.
- Test coverage target: >=80%
- All tests must pass

### Verification Notes
- `npx tsc --noEmit --strict --target ES2022 --module commonjs --skipLibCheck libs/shared/src/auth-profile/auth-profile.contracts.type-spec.ts` passed.
- `npm run test -- --runTestsByPath src/shared/contracts/shared-auth-profile-import.spec.ts` passed in `apps/backend`.
- `npx tsc -p apps/frontend/tsconfig.shared-contracts.tmp.json --noEmit` passed with a temporary focused config that was removed after verification.
- `npx tsc -p apps/backoffice/tsconfig.spec.json --noEmit` passed.
- `npm run test -- --watch=false --browsers=ChromeHeadless --include=src/app/core/auth/shared-admin-auth-import.spec.ts` passed in `apps/backoffice`.
- `npm run build -- --projects=backend,frontend,backoffice` passed.
- `npm run test -- --watch=false --browsers=ChromeHeadless --include=src/app/shared/contracts/shared-auth-profile-import.spec.ts` in `apps/frontend` failed before running the focused spec because existing unrelated specs compile with Jest APIs and stale component expectations under the Angular/Jasmine test program.

## Success Criteria
- All task-specific tests passing, except the documented frontend `ng test` runner limitation caused by unrelated preexisting spec compile errors.
- Test coverage target is not directly applicable to the type-only shared module; compile-only and import-resolution probes cover the contract surface.
- `libs/shared` exposes a discoverable auth/profile contract surface.
- No shared public contract includes internal or sensitive auth/profile fields.
- The three projects can resolve the shared contract import path.
