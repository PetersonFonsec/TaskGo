---
status: completed
title: Introduce the authenticated shell and mobile drawer
type: refactor
complexity: high
dependencies:
  - task_01
  - task_02
---

# Task 03: Introduce the authenticated shell and mobile drawer

## Overview

Create the route-defined authenticated shell, connect the shared header and navigation, and provide the accessible mobile drawer. Migrate the `general` branch as the first representative authenticated area so the shell and drawer are independently exercisable through Cypress before other route families move.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- A route-defined authenticated shell MUST compose Header, desktop Aside, mobile drawer, nested RouterOutlet, and Footer.
- The shell MUST own drawer state and connect the Task 02 trigger contract to the shared Task 01 navigation.
- The drawer MUST close on Escape, backdrop activation, and successful Router navigation, but MUST remain open on cancelled or failed navigation.
- Opening the drawer MUST transfer and contain focus; dismissal MUST restore focus to the trigger.
- The closed drawer MUST be absent from interaction and the accessibility tree.
- The drawer MUST open without network activity and complete its visual transition within 200 ms.
- The `general` route branch MUST move beneath the shell without changing public URLs, redirects, or dynamic user parameters.
- Public institutional and authentication routes MUST remain outside the shell.
- Initial drawer state MUST be SSR-safe and closed without browser-global access during construction.
- Feature verification MUST use Cypress only and cover at least 80% of this task's behavioral requirements.
</requirements>

## Subtasks

- [x] 3.1 Create the authenticated shell composition and nested-content boundary.
- [x] 3.2 Add the mobile drawer surface, backdrop, navigation content, and deterministic open-state marker.
- [x] 3.3 Connect trigger, dismissal, navigation-success, and focus-restoration behavior.
- [x] 3.4 Apply shared 768 px responsive presentation, layering, and the 200 ms transition ceiling.
- [x] 3.5 Move the `general` branch beneath the shell and remove its duplicate `Page` chrome.
- [x] 3.6 Add Cypress coverage for shell composition, drawer accessibility, navigation closure, SSR-safe direct entry, and public-route isolation.

## Implementation Details

Follow the TechSpec sections "`AuthenticatedShell`", "`MobileNavigationDrawer`", "Runtime Data Flow", and "Router composition". Keep the implementation within existing frontend packages; a compact standalone shell/drawer definition may use local template and styles to stay below the seven-file task boundary.

### Relevant Files

- `apps/frontend/src/app/shared/components/ui/authenticated-shell/authenticated-shell.ts` — authenticated layout, drawer state, focus, and Router event ownership to create.
- `apps/frontend/src/app/app.routes.ts` — authenticated parent and `general` child composition.
- `apps/frontend/src/app/modules/general/general.ts` — remove shared `Page` ownership while retaining feature routing.
- `apps/frontend/src/app/modules/general/general.html` — retain the nested feature outlet without duplicate chrome.
- `apps/frontend/cypress/e2e/adaptive-navigation.cy.ts` — first complete responsive drawer and shell flow.

### Dependent Files

- `apps/frontend/src/app/shared/components/ui/page/page.ts` — existing composition reference while other branches still depend on it.
- `apps/frontend/src/app/shared/components/ui/header/header.ts` — Task 02 trigger contract.
- `apps/frontend/src/app/shared/components/ui/aside/aside.ts` — Task 01 resolved navigation content.
- `apps/frontend/src/app/shared/components/ui/footer/footer.ts` — shell footer composition.
- `apps/frontend/src/app/app.routes.server.ts` — SSR route behavior that must remain compatible.
- `apps/frontend/src/app/app.config.ts` — hydration and event replay configuration.
- `apps/frontend/src/app/shared/service/user-logged/user-logged.service.ts` — current-user source and SSR conventions.

### Related ADRs

- [ADR-001: Adopt Unified Adaptive Navigation](adrs/adr-001.md) — defines adaptive presentation parity.
- [ADR-002: Centralize Authenticated Navigation in an Adaptive Shell](adrs/adr-002.md) — defines the shell, drawer, routing, and accessibility approach.
- [ADR-003: Verify Adaptive Navigation with Cypress End-to-End Tests](adrs/adr-003.md) — requires real-browser verification.

## Deliverables

- Route-defined authenticated shell with one nested content boundary.
- Accessible mobile drawer connected to the shared header and navigation.
- `general` branch migrated without URL or redirect changes.
- Cypress scenarios for responsive composition, focus, dismissal, navigation, direct entry, and public-route isolation.
- Unit tests: not applicable under ADR-003; no Jasmine/TestBed feature tests are added.
- Cypress behavioral requirement coverage >=80% **(REQUIRED)**.
- Focused Cypress scenarios and frontend production build passing **(REQUIRED)**.

## Tests

- Unit tests:
  - [x] Not applicable: ADR-003 requires Cypress-only verification for this feature.
- Integration tests:
  - [x] At 375×667, an authenticated general route renders one header/footer, no desktop rail, and one mobile trigger.
  - [x] At 1280×800, the same route renders the persistent aside and no mobile trigger or drawer.
  - [x] One trigger activation opens the drawer, sets expanded state, and completes within 200 ms without a network request.
  - [x] Initial focus enters the drawer and Tab/Shift+Tab remain contained.
  - [x] Escape and backdrop dismissal close the drawer and restore trigger focus.
  - [x] Selecting Personal Data or Addresses closes only after successful navigation.
  - [x] Direct entry and refresh on `/general/42/profile/view` render one shell with the drawer initially closed.
  - [x] Authentication and institutional routes render no authenticated shell or navigation.
- Test coverage target: >=80% of stated behavioral requirements in Cypress.
- All tests must pass.

## Success Criteria

- All tests passing.
- Cypress behavioral requirement coverage >=80%.
- The `general` branch retains its existing public URLs and dynamic user parameters.
- Authenticated content renders exactly one shared chrome composition.
- Keyboard users can open, operate, and dismiss the drawer with predictable focus.
- Drawer opening completes in no more than 200 ms.
