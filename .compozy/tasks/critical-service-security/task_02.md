---
status: pending
title: Minimize public and private user-provider responses
type: backend
complexity: high
dependencies:
  - task_01
---

# Task 02: Minimize public and private user-provider responses

## Overview

Reduce user and provider responses to the minimum fields required by each journey. Current provider queries include complete user records, and frontend models reveal that private fields such as `passwordHash`, CPF, email, phone, and internal payment-related values are treated as available response data.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. Public provider discovery responses MUST expose only fields required to evaluate a provider and active services.
- 2. Password hashes and credentials MUST NEVER appear in user-facing responses.
- 3. CPF, private email, private phone, full address, and internal payment identifiers MUST remain private by default.
- 4. Private account responses MUST expose only the authenticated user's contextual data.
- 5. Existing anonymous browsing of categories, active services, and public provider profiles MUST remain functional.
- 6. Because `_techspec.md` is missing, the exact response DTO boundaries and field allowlists MUST be confirmed during implementation without expanding scope beyond the PRD.
</requirements>

## Subtasks

- [ ] 02.1 Define field allowlists for public provider discovery and private account responses.
- [ ] 02.2 Remove sensitive and internal fields from public provider list, category-filtered provider list, and provider-profile responses.
- [ ] 02.3 Ensure private user responses exclude credentials and return only contextual fields.
- [ ] 02.4 Confirm public reputation and active-service information remain available to visitors.
- [ ] 02.5 Add regression tests that inspect serialized responses for forbidden fields.

## Implementation Details

Several Prisma queries currently use broad `include: { user: true }` or return full related records. Replace broad exposure with response shaping appropriate to the journey. Do not decide future post-confirmation contact disclosure in this task; the PRD leaves that policy open.

### Relevant Files

- `apps/backend/src/modules/provider/provider.service.ts` — Public provider queries currently include full related users and internal provider data.
- `apps/backend/src/modules/provider/provider.controller.ts` — Public provider discovery endpoints.
- `apps/backend/src/modules/user/queries/get-user/get-user.handle.ts` — Private user query currently loads broad relations.
- `apps/backend/src/modules/user/queries/get-user/get-user.dto.ts` — Existing response DTO needs least-privilege review.
- `apps/backend/src/modules/user/user.service.ts` — Private user reads can expose broad relations.

### Dependent Files

- `apps/frontend/src/app/shared/service/users/user.model.ts` — Current provider and user response assumptions include private fields.
- `apps/frontend/src/app/shared/service/user-logged/user-logged.model.ts` — Logged-user model currently declares `passwordHash`.
- `apps/frontend/src/app/shared/service/order/order.model.ts` — Order-related user and provider models currently include sensitive fields.
- `apps/frontend/src/app/modules/common/single-user/single-user.ts` — Public provider profile consumer.

### Related ADRs

- [ADR-001: Protect the Complete Critical Marketplace Journey](adrs/adr-001.md) — Requires contextual data minimization while preserving public provider discovery.

## Deliverables

- Explicit least-privilege responses for public provider discovery.
- Credential-free private user responses.
- Regression protection against accidental sensitive-field exposure.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for public and private response field allowlists **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Public provider list serialization excludes `passwordHash`, CPF, email, phone, addresses, and payment identifiers.
  - [ ] Category-filtered provider serialization returns active matching services without private user fields.
  - [ ] Public provider profile serialization keeps public profile and reputation fields while excluding private fields.
  - [ ] Private user serialization excludes password hashes and credentials.
- Integration tests:
  - [ ] Anonymous provider discovery returns public provider information and active services.
  - [ ] Anonymous provider discovery responses contain none of the forbidden sensitive fields.
  - [ ] Authenticated private account response contains no password hash.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Zero password hashes in user-facing responses.
- Zero sensitive personal fields in public marketplace responses.
- Anonymous public provider discovery remains functional.
