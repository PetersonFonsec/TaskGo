---
status: completed
title: Align backend customer auth and profile contracts
type: backend
complexity: high
dependencies:
  - task_01
---

# Task 2: Align backend customer auth and profile contracts

## Overview
Update customer-facing backend auth and profile endpoints to use the shared public contracts from `libs/shared`. This task keeps NestJS validation local while ensuring serialized responses and request payloads match the new shared vocabulary.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Backend DTO classes MUST remain backend-local and MAY implement or map to shared contract types.
- `POST /auth/login`, `POST /auth/register`, `GET /user/:id`, and `PATCH /user/:id` MUST return JSON-safe public auth/profile shapes.
- Customer auth/profile responses MUST NOT expose `password`, `passwordHash`, raw `bigint`, raw `Date`, orders, reviews, or provider internals in the shared base contract.
- Provider-home login data MUST remain outside the base shared customer session contract for the MVP.
- Existing endpoint paths and auth behavior MUST remain unchanged.
</requirements>

## Subtasks
- [x] 2.1 Import shared contracts into customer auth/user backend modules.
- [x] 2.2 Align login and register request DTOs with shared request contracts while preserving validation.
- [x] 2.3 Map login and register responses to the shared customer session shape.
- [x] 2.4 Map user profile read and update responses to the shared public profile shape.
- [x] 2.5 Update backend customer auth/profile tests for sanitized shared shapes.
- [x] 2.6 Confirm customer auth/profile endpoints keep their current routes and behavior.

## Implementation Details
Use the TechSpec `API Endpoints`, `Data Models`, and `Testing Approach` sections as the implementation guide. Add mapper functions only if return type annotations alone cannot guarantee sanitized JSON-safe responses. Keep provider-home data as an app-specific extension instead of moving it into the shared base session.

### Relevant Files
- `apps/backend/src/modules/auth/auth.controller.ts` — returns customer login/register responses.
- `apps/backend/src/modules/auth/queries/login/login.dto.ts` — customer login validation DTO.
- `apps/backend/src/modules/auth/dto/auth-register.dto.ts` — customer registration validation DTO.
- `apps/backend/src/modules/user/user.controller.ts` — exposes profile read/update endpoints.
- `apps/backend/src/modules/user/dto/create-user.dto.ts` — registration payload validation shape.
- `apps/backend/src/modules/user/dto/update-user.dto.ts` — profile update validation shape.
- `apps/backend/src/modules/user/queries/get-user/get-user.dto.ts` — existing public user response DTO.
- `apps/backend/src/modules/user/user.service.ts` — profile update/read service behavior.

### Dependent Files
- `apps/backend/src/modules/auth/auth.controller.spec.ts` — currently smoke-only and should assert response shape.
- `apps/backend/src/modules/user/user.controller.spec.ts` — should reflect shared public profile response behavior when applicable.
- `apps/backend/src/modules/user/user.service.spec.ts` — may need updates for sanitized update/read expectations.
- `apps/frontend/src/app/modules/auth/services/login/login.ts` — depends on the customer login response shape.
- `apps/frontend/src/app/shared/service/users/user.ts` — depends on profile read/update response shapes.

### Related ADRs
- [ADR-001: Prioritize Shared Domain Language for Authentication and Profile](adrs/adr-001.md) — Defines the product boundary for customer auth/profile sharing.
- [ADR-002: Use Pure Serializable TypeScript Contracts for Auth and Profile](adrs/adr-002.md) — Requires backend adapters around shared JSON-safe contracts.

## Deliverables
- Customer backend auth/profile endpoints aligned with shared contracts.
- Backend DTOs preserved as validation adapters.
- Sanitized customer auth/profile response mapping or return typing.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for customer auth/profile endpoint contract behavior **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] `AuthController.login` with a customer user returns `access_token` and public `user` without password fields.
  - [x] `AuthController.register` returns a shared customer session shape after user creation.
  - [x] Profile update with name/email/phone returns a public profile shape with string id fields.
  - [x] Provider login keeps provider-home data outside the shared base session contract.
- Integration tests:
  - [x] `POST /auth/login` response body matches the shared customer session shape.
  - [x] `POST /auth/register` accepts the shared registration payload shape through the backend DTO.
  - [x] `GET /user/:id` response omits password/passwordHash, orders, reviews, and provider internals.
  - [x] `PATCH /user/:id` accepts shared editable profile fields and returns a public profile shape.
- Test coverage target: >=80%
- All tests must pass

### Verification Notes
- `npm run test -- --runTestsByPath src/modules/auth/auth.controller.spec.ts src/modules/user/user.controller.spec.ts src/modules/user/mappers/public-user-profile.mapper.spec.ts src/shared/contracts/shared-auth-profile-import.spec.ts` passed in `apps/backend`.
- `npm run build` passed in `apps/backend`.
- `npm run build -- --projects=backend,frontend,backoffice` passed from the workspace root.
- `git diff --check` passed.
- `npm run test -- --runInBand` in `apps/backend` was attempted and failed because Prisma-backed suites could not connect to `localhost:5432`; `docker compose up -d postgres_db` could not start the dependency because Docker daemon socket was unavailable.

## Success Criteria
- Task-specific tests passing.
- Test coverage target is covered by focused controller/mapper specs for the changed backend surface; the full backend suite remains blocked by unavailable local database infrastructure.
- Customer auth/profile backend code compiles against shared contracts.
- Customer endpoint responses are JSON-safe and sanitized.
- No customer endpoint path or auth behavior changes are introduced.
