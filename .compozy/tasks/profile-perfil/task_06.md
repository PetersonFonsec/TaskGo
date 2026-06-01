---
status: pending
title: "Frontend: implement address management UI for add/edit/delete and labeled address types"
type: frontend
complexity: medium
dependencies:
  - task_03
---

# Task 06: Frontend: implement address management UI for add/edit/delete and labeled address types

## Overview
Add a user-facing Address management UI where users can add, edit, delete, and mark a primary address. Support labeled addresses (home, work, service) and reuse shared address form components.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- UI must support create/edit/delete of addresses using backend address CRUD.
- Allow selecting an address as primary (isDefault) and reflect change in UI immediately upon success.
- Validate required address fields and display informative errors.
</requirements>

## Subtasks
- [ ] 06.1 Create `AddressList` and `AddressForm` components.
- [ ] 06.2 Wire create/update/delete requests to backend address endpoints.
- [ ] 06.3 Show proper UX when changing primary address (optimistic UI or loading state).
- [ ] 06.4 Add unit and e2e tests for address flows.

## Implementation Details

### Relevant Files
- `apps/frontend/src/app/modules/profile/address-list.component.*` — new list UI.
- `apps/frontend/src/app/modules/profile/address-form.component.*` — new form UI.
- `apps/frontend/cypress/e2e/` — add address management e2e specs.

### Dependent Files
- Backend address endpoints implemented in `apps/backend/src/modules/address` (task_03).
- `apps/frontend/src/app/shared` — reuse validators and form components.

### Related ADRs
- [ADR-001: Modular phased rollout for Profile screens](../adrs/adr-001.md)

## Deliverables
- AddressList and AddressForm components, integrated with backend.
- Unit tests and Cypress e2e tests covering add/edit/delete and primary address switching.

## Tests
- Unit tests:
  - [ ] creating an address posts expected payload and updates list.
  - [ ] editing an address persists changes and reflects in list.
  - [ ] deleting an address removes it from UI.
- E2E tests:
  - [ ] full add/edit/delete and primary address selection scenario.
- Test coverage target: >=80% for modified components.

## Success Criteria
- Address management works in frontend and backend integration tests; UI shows accurate primary address state.
