---
status: pending
title: "Frontend: implement shared Profile view and Edit screen using existing profile modules"
type: frontend
complexity: medium
dependencies:
  - task_02
---

# Task 05: Frontend: implement shared Profile view and Edit screen using existing profile modules

## Overview
Create a shared Profile view and Edit screen (one component used by clients and professionals) that consumes the backend profile endpoints. The Edit screen should validate inputs (email/phone), show verification status, and allow navigating to address management.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Provide a `ProfileView` component to display core fields and addresses (calls GET /user/:id).
- Provide a `ProfileEdit` component/form to update allowed fields and call PATCH /user/:id.
- Inline validation for `email` and `phone` must be present; changes that require verification should indicate pending state.
- Reuse existing design system and shared components under `apps/frontend/src/app/shared`.
</requirements>

## Subtasks
- [ ] 05.1 Add `ProfileView` component and route.
- [ ] 05.2 Add `ProfileEdit` component with form + validation.
- [ ] 05.3 Wire save flow to call backend PATCH and surface errors.
- [ ] 05.4 Add unit tests and component specs; add a Cypress spec skeleton for e2e.

## Implementation Details

### Relevant Files
- `apps/frontend/src/app/modules/profile/` — new component files to create here: `profile.component.ts/html/scss`, `profile-edit.component.ts`.
- `apps/frontend/src/app/shared/` — reuse form controls, validators and services.
- `apps/frontend/cypress/e2e/` — add e2e spec for Profile edit flow.

### Dependent Files
- `apps/frontend/src/app/app.routes.ts` — register routes for profile view/edit.
- Backend endpoints: `PATCH /user/:id`, `GET /user/:id` (task_02).

### Related ADRs
- [ADR-001: Modular phased rollout for Profile screens](../adrs/adr-001.md)

## Deliverables
- `ProfileView` and `ProfileEdit` components with unit tests.
- Cypress e2e skeleton for profile save flow.

## Tests
- Unit tests:
  - [ ] `ProfileView` renders returned fields and address list correctly.
  - [ ] `ProfileEdit` validation prevents invalid email/phone submissions.
- Integration/E2E:
  - [ ] Edit -> Save -> Verify backend persisted changes (Cypress or integration test).
- Test coverage target: >=80% for modified components.

## Success Criteria
- Components implemented and wired to backend; tests passing.
- Inline validation present and behaves as specified.
