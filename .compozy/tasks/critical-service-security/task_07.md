---
status: pending
title: Align frontend address journey with authenticated ownership
type: frontend
complexity: medium
dependencies:
  - task_03
---

# Task 07: Align frontend address journey with authenticated ownership

## Overview

Adapt the frontend profile address journey to the owner-scoped backend contract. The current address service sends a `userId` query parameter even though ownership must come from the authenticated session.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. Frontend address listing MUST rely on the authenticated session rather than a browser-supplied owner ID.
- 2. Frontend address creation MUST submit only address fields required by the owner-scoped backend contract.
- 3. Address screens MUST continue to display the authenticated user's addresses with label and coordinate context preserved.
- 4. Access-denied and validation responses MUST produce a clear user-visible message.
- 5. Because `_techspec.md` is missing, the final endpoint shape MUST follow the backend contract delivered by `task_03`.
</requirements>

## Subtasks

- [ ] 07.1 Remove client-controlled owner identity from address-list requests.
- [ ] 07.2 Align address creation payloads and models with the owner-scoped backend contract.
- [ ] 07.3 Preserve profile address rendering for label, location, and coordinates.
- [ ] 07.4 Present clear user-visible messages for access-denied and validation failures.
- [ ] 07.5 Add frontend tests for owner-scoped address requests and profile rendering.

## Implementation Details

The current address service accepts `getAddress(userId)` and appends the ID as a query parameter. Replace that assumption after `task_03` defines the authenticated endpoint behavior. Keep profile visuals unchanged unless contract adaptation requires a narrow correction.

### Relevant Files

- `apps/frontend/src/app/shared/service/address/address.ts` — Current owner ID query parameter and create request.
- `apps/frontend/src/app/shared/service/address/address.model.ts` — Address request and response contracts.
- `apps/frontend/src/app/modules/general/profile/address/address.ts` — Profile list and create consumer.
- `apps/frontend/src/app/modules/general/profile/address/components/address-form/address-form.ts` — Address form payload.

### Dependent Files

- `apps/frontend/src/app/shared/interceptors/token/token.interceptor.ts` — Supplies the session token used by the protected backend contract.
- `apps/frontend/src/app/shared/service/user-logged/user-logged.service.ts` — Existing local user state should no longer be used as an address authorization source.

### Related ADRs

- [ADR-001: Protect the Complete Critical Marketplace Journey](adrs/adr-001.md) — Requires address access to be isolated to the authenticated user.

## Deliverables

- Owner-scoped frontend address list request.
- Address creation payload aligned with complete contextual persistence.
- Preserved profile address display and clear error feedback.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for the frontend authenticated address journey **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Address list request does not append a client-controlled `userId`.
  - [ ] Address creation request includes label, location fields, coordinates, and optional complement when supplied.
  - [ ] Profile address screen stores the authenticated user's returned addresses.
  - [ ] Access-denied response produces a clear profile error message.
  - [ ] Validation failure produces a clear profile error message.
- Integration tests:
  - [ ] Authenticated user opens the profile address page and sees only the returned owner-scoped addresses.
  - [ ] Authenticated user creates an address and sees the saved contextual values.
  - [ ] Anonymous access to the protected address journey redirects or displays the expected login requirement.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Browser requests no longer choose the address owner identity.
- Profile address management remains usable with owner-scoped backend behavior.
- Label and coordinate context remain visible after address creation.
