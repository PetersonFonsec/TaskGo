---
status: completed
title: Add an accessible mobile menu trigger to the header
type: frontend
complexity: medium
dependencies:
  - task_01
---

# Task 02: Add an accessible mobile menu trigger to the header

## Overview

Extend the shared header with the compact-screen control that will open the authenticated navigation drawer in Task 03. The control establishes an accessible state contract without changing desktop discoverability or introducing a second breakpoint.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- The header MUST expose a typed open-state input and toggle output that the authenticated shell can own.
- The trigger MUST provide an accessible name, `aria-expanded`, and `aria-controls` associated with the future drawer.
- The trigger MUST be visible below the shared 768 px tablet breakpoint and absent at or above that breakpoint.
- Existing brand, notification, profile, and home-navigation behavior MUST remain unchanged.
- The trigger MUST have a stable accessible selector suitable for Cypress.
- Styling MUST reuse the shared breakpoint system and MUST NOT introduce a competing viewport boundary.
- Feature verification MUST use Cypress only and cover at least 80% of this task's behavioral requirements.
</requirements>

## Subtasks

- [x] 2.1 Define the header input/output contract for drawer state and toggle requests.
- [x] 2.2 Add the accessible navigation trigger without displacing existing header actions.
- [x] 2.3 Apply compact-only visibility using the shared tablet breakpoint.
- [x] 2.4 Preserve existing header behavior and responsive branding.
- [x] 2.5 Extend the focused Cypress specification with trigger visibility and state-contract scenarios.

## Implementation Details

Follow the TechSpec sections "`Header`" and "Existing responsive system". This task delivers the trigger contract only; Task 03 connects it to the drawer and owns the actual open state.

### Relevant Files

- `apps/frontend/src/app/shared/components/ui/header/header.ts` — standalone header inputs, outputs, and existing actions.
- `apps/frontend/src/app/shared/components/ui/header/header.html` — current brand, notifications, and profile composition.
- `apps/frontend/src/app/shared/components/ui/header/header.scss` — current mobile header rule and responsive brand behavior.
- `apps/frontend/cypress/e2e/adaptive-navigation.cy.ts` — trigger contract and responsive visibility coverage.

### Dependent Files

- `apps/frontend/src/app/shared/components/ui/page/page.html` — current host used before shell migration.
- `apps/frontend/src/app/shared/components/ui/page/page.scss` — current sticky-header layering and 768 px layout behavior.
- `apps/frontend/src/app/scss/variables/_breakpoints.scss` — canonical `$tablet` breakpoint.
- `apps/frontend/src/app/shared/components/ui/authenticated-shell/authenticated-shell.ts` — Task 03 consumer of the trigger contract.

### Related ADRs

- [ADR-001: Adopt Unified Adaptive Navigation](adrs/adr-001.md) — requires a predictable compact navigation control.
- [ADR-002: Centralize Authenticated Navigation in an Adaptive Shell](adrs/adr-002.md) — assigns open-state ownership to the shell.
- [ADR-003: Verify Adaptive Navigation with Cypress End-to-End Tests](adrs/adr-003.md) — requires browser-level verification.

## Deliverables

- Header state and toggle contract for the authenticated shell.
- Accessible mobile trigger with stable control relationship and Cypress selector.
- Compact-only responsive styling using the existing breakpoint.
- Cypress scenarios for mobile and desktop visibility and ARIA state.
- Unit tests: not applicable under ADR-003; no Jasmine/TestBed feature tests are added.
- Cypress behavioral requirement coverage >=80% **(REQUIRED)**.
- Focused Cypress scenarios passing **(REQUIRED)**.

## Tests

- Unit tests:
  - [x] Not applicable: ADR-003 requires Cypress-only verification for this feature.
- Integration tests:
  - [x] At 767 px width, the menu trigger is visible and existing notification/profile controls remain present.
  - [x] At 768 px width, the menu trigger is absent while desktop header content remains present.
  - [x] The closed trigger exposes the expected accessible name, `aria-expanded="false"`, and drawer control ID.
  - [x] Before Task 03 connects the host contract, activating the trigger does not navigate or mutate header-owned state.
  - [x] Existing brand activation still navigates to the authenticated user's home route.
- Test coverage target: >=80% of stated behavioral requirements in Cypress.
- All tests must pass.

## Success Criteria

- All tests passing.
- Cypress behavioral requirement coverage >=80%.
- The trigger is discoverable only on compact screens.
- The shell can control and observe the trigger without header-owned navigation state.
- Existing desktop header behavior has no regression.
