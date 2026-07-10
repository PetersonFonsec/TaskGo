---
status: completed
title: Align backend admin auth contracts
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 3: Align backend admin auth contracts

## Overview
Update backend administrative auth endpoints to produce and consume the shared admin auth/session contracts. This task keeps admin authorization and token validation behavior unchanged while making the public admin operator/session shape consistent with backoffice usage.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- `POST /admin/auth/login` MUST use the shared login request and admin session response contract.
- `GET /admin/auth/me` MUST use the shared admin me response contract.
- Admin operator responses MUST serialize ids and timestamps as JSON-safe values.
- Admin token payload internals MUST remain backend-local and MUST NOT become a shared public contract.
- Existing admin auth guards, roles, audit behavior, and endpoint paths MUST remain unchanged.
</requirements>

## Subtasks
- [x] 3.1 Import shared admin auth contracts into backend admin auth modules.
- [x] 3.2 Align `AdminAuthLoginDto` with the shared login request while preserving validation.
- [x] 3.3 Align admin login and me responses with shared admin session/me contracts.
- [x] 3.4 Ensure admin token payload types remain backend-local.
- [x] 3.5 Update admin auth service/controller tests for shared response shapes.

## Implementation Details
Use the TechSpec `API Endpoints` and `Data Models` sections for admin auth boundaries. Prefer response mapping at `AdminOperatorResponseDto` or service return points when raw Prisma values need serialization. Do not move guard internals or token payload details into shared contracts.

### Relevant Files
- `apps/backend/src/modules/admin/auth/admin-auth.controller.ts` — exposes admin login and me endpoints.
- `apps/backend/src/modules/admin/auth/admin-auth.service.ts` — creates admin session response and operator response.
- `apps/backend/src/modules/admin/auth/dto/admin-auth-login.dto.ts` — admin login validation DTO.
- `apps/backend/src/modules/admin/auth/dto/admin-operator-response.dto.ts` — admin operator public response mapping.
- `apps/backend/src/modules/admin/auth/admin-auth-token.service.ts` — backend-local token payload logic.
- `apps/backend/src/modules/admin/auth/admin-actor.ts` — backend-local authenticated admin actor.

### Dependent Files
- `apps/backend/src/modules/admin/auth/admin-auth.service.spec.ts` — asserts sanitized operator login response.
- `apps/backend/src/modules/admin/auth/admin-auth.controller.spec.ts` — asserts admin auth endpoint response shape.
- `apps/backoffice/src/app/core/auth/admin-auth.service.ts` — consumes admin login/me contracts.
- `apps/backoffice/src/app/core/auth/admin-session.model.ts` — will be replaced by shared contracts in a later task.

### Related ADRs
- [ADR-001: Prioritize Shared Domain Language for Authentication and Profile](adrs/adr-001.md) — Includes backoffice auth/session language in the MVP.
- [ADR-002: Use Pure Serializable TypeScript Contracts for Auth and Profile](adrs/adr-002.md) — Requires shared JSON-safe admin auth contracts.

## Deliverables
- Backend admin auth DTO/response code aligned with shared contracts.
- Backend-local token payload and guard internals preserved.
- Admin auth tests updated for shared admin session/me shapes.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for admin auth endpoint contract behavior **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] `AdminAuthService.login` returns `access_token` and a shared admin operator shape.
  - [x] `AdminAuthService.toResponse` serializes operator id and activated timestamp as JSON-safe values.
  - [x] Admin token payload validation continues rejecting stale token versions and role mismatches.
- Integration tests:
  - [x] `POST /admin/auth/login` accepts the shared login request shape and returns the shared admin session shape.
  - [x] `GET /admin/auth/me` returns the shared admin me response wrapper.
  - [x] Admin auth guard behavior remains unchanged for invalid ordinary marketplace tokens.
- Test coverage target: >=80%
- All tests must pass

### Verification Notes
- `npm run test -- --runTestsByPath src/modules/admin/users/admin-users.service.spec.ts src/modules/admin/auth/admin-auth.service.spec.ts src/modules/admin/auth/admin-auth.controller.spec.ts src/modules/admin/auth/admin-auth-token.service.spec.ts src/modules/admin/auth/admin-auth.guard.spec.ts` passed in `apps/backend` with 5 suites and 30 tests.
- `npm run build` passed in `apps/backend`.
- `npm run build -- --projects=backend,frontend,backoffice` passed from the workspace root.
- `compozy tasks validate --name shared-libs-entities-interfaces` passed.
- `git diff --check` passed.
- The root build still emits existing frontend budget/CommonJS warnings and an SSR-time `localhost:3000/categories` fetch warning, but exits successfully.

## Success Criteria
- Task-specific tests passing.
- Test coverage target is covered by focused admin auth/user specs for the changed backend surface.
- Backend admin auth compiles against shared contracts.
- Admin token internals stay backend-local.
- Backoffice can consume the backend admin response shape without redefining public contracts.
