---
status: completed
title: Consolidate valid role-aware navigation configuration
type: refactor
complexity: high
dependencies: []
---

# Task 01: Consolidate valid role-aware navigation configuration

## Overview

Create one typed source for authenticated navigation and make the existing desktop presentation consume it. The task removes destinations that have no registered route, resolves personal URLs from the authenticated user, preserves logout as an action, and establishes the shared content later used by the mobile drawer.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- The navigation configuration MUST be immutable and typed for groups, role availability, link/action kind, user-aware path resolution, and exact/prefix active matching.
- The rendered menu MUST contain only registered Personal Data and Addresses links plus Logout until other destination routes exist.
- Personal Data and Addresses URLs MUST use the authenticated user ID and MUST NOT contain the current hard-coded ID `1`.
- Customer and provider role values MUST be normalized against the runtime API values used by guards.
- Route guards MUST remain authoritative; menu filtering MUST NOT replace authorization.
- Personal Data MUST remain active on its child view and edit routes, while Addresses MUST use exact matching.
- Logout MUST remain a semantic action backed by `UserLoggedService`, not a fake route.
- Feature verification MUST use Cypress only and cover at least 80% of this task's behavioral requirements.
</requirements>

## Subtasks

- [x] 1.1 Define the shared typed navigation contract and immutable configuration.
- [x] 1.2 Limit the configuration to registered personal links and logout, removing empty groups and unavailable promotions.
- [x] 1.3 Resolve user-specific URLs and normalize supported customer/provider role representations.
- [x] 1.4 Refactor the shared aside to render resolved groups and actions.
- [x] 1.5 Refactor list items for semantic links/actions, exact or prefix state, `aria-current`, and stable selectors.
- [x] 1.6 Add non-skipped Cypress coverage for desktop content, dynamic URLs, roles, active state, unavailable entries, and logout.

## Implementation Details

Follow the TechSpec sections "Core Interfaces", "Data Models", and "Active route resolution". Keep the configuration local to the frontend, avoid API or persistence work, and preserve `UserLoggedService` as the logout owner.

### Relevant Files

- `apps/frontend/src/app/shared/components/ui/aside/aside.constant.ts` — current weak item contract, fixed user ID, and unavailable destinations.
- `apps/frontend/src/app/shared/components/ui/aside/aside.ts` — currently owns input defaults and logout construction.
- `apps/frontend/src/app/shared/components/ui/aside/aside.html` — currently renders unavailable groups, support, and Premium content.
- `apps/frontend/src/app/shared/components/ui/aside-list-item/aside-list-item.ts` — current string-only item inputs.
- `apps/frontend/src/app/shared/components/ui/aside-list-item/aside-list-item.html` — current exact-only active-link behavior.
- `apps/frontend/src/app/shared/components/ui/aside-list-item/aside-list-item.scss` — active styling and interaction target behavior.
- `apps/frontend/cypress/e2e/adaptive-navigation.cy.ts` — focused, non-skipped behavioral coverage to create.

### Dependent Files

- `apps/frontend/src/app/modules/general/general.routes.ts` — authoritative registered profile and address route structure.
- `apps/frontend/src/app/shared/service/user-logged/user-logged.service.ts` — current user ID, role, and logout source.
- `apps/frontend/src/app/shared/service/user-logged/user-logged.model.ts` — declared user shape.
- `apps/frontend/src/app/shared/enums/roles.enum.ts` — frontend and API role constants.
- `apps/frontend/src/app/app.routes.ts` — current protected route branches and guard placement.
- `apps/frontend/cypress/e2e/booking.cy.ts` — established authenticated local-storage setup.

### Related ADRs

- [ADR-001: Adopt Unified Adaptive Navigation](adrs/adr-001.md) — requires one consistent destination source.
- [ADR-002: Centralize Authenticated Navigation in an Adaptive Shell](adrs/adr-002.md) — defines typed, role-aware, user-resolved navigation.
- [ADR-003: Verify Adaptive Navigation with Cypress End-to-End Tests](adrs/adr-003.md) — limits feature verification to Cypress.

## Deliverables

- Typed, immutable navigation configuration with valid role and route metadata.
- Shared aside and list-item rendering for Personal Data, Addresses, and Logout.
- Removal of unavailable destinations from both future responsive presentations.
- Cypress scenarios covering valid content, dynamic user paths, active state, roles, and logout.
- Unit tests: not applicable under ADR-003; no Jasmine/TestBed feature tests are added.
- Cypress behavioral requirement coverage >=80% **(REQUIRED)**.
- Focused Cypress scenarios passing **(REQUIRED)**.

## Tests

- Unit tests:
  - [x] Not applicable: ADR-003 requires Cypress-only verification for this feature.
- Integration tests:
  - [x] With authenticated customer ID `42` at `/general/42/profile/view`, render only Personal Data, Addresses, and Logout.
  - [x] At profile view and edit child routes, expose `aria-current="page"` only on Personal Data.
  - [x] At `/general/42/addresses`, expose `aria-current="page"` only on Addresses.
  - [x] Personal Data and Addresses navigate with user ID `42` and never with ID `1`.
  - [x] Customer and provider API role values both receive the valid common navigation.
  - [x] Cards, payments, security, notifications, preferences, support, provider details, bank account, earnings, and Premium are absent.
  - [x] Logout removes `@ODIN/TOKEN` and `@ODIN/USER` and enters the authentication flow without visiting `/customer/logout`.
- Test coverage target: >=80% of stated behavioral requirements in Cypress.
- All tests must pass.

## Success Criteria

- All tests passing.
- Cypress behavioral requirement coverage >=80%.
- Every rendered link targets a registered general route.
- No rendered path contains a hard-coded user ID.
- Desktop navigation exposes semantic active and logout behavior for both authenticated roles.
