---
status: completed
title: Migrate customer and provider route branches into the authenticated shell
type: refactor
complexity: high
dependencies:
  - task_03
---

# Task 04: Migrate customer and provider route branches into the authenticated shell

## Overview

Move the customer and provider route families beneath the authenticated shell created in Task 03. Reduce both feature wrappers to nested outlets so every role receives one shared chrome while all URLs, lazy routes, titles, dynamic parameters, and authorization behavior remain intact.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Customer and provider branches MUST become children of the Task 03 authenticated shell without changing `/customer/**` or `/provider/**` URLs.
- `unauthorizedGuard` and each branch's `permissionByRoleGuard` MUST preserve current allow and redirect behavior.
- Customer and provider wrappers MUST stop rendering `Page` and MUST retain their nested RouterOutlet.
- Existing child-route order, titles, lazy loading, path matching, and dynamic parameters MUST remain unchanged.
- The generic customer `:userId` route MUST remain after its specific sibling routes.
- The provider approval route MUST preserve its full-path matching behavior.
- Authenticated sessions used in verification MUST use runtime role values `CLIENTE` and `PRESTADOR`.
- Both mobile and desktop presentations MUST render exactly one shell and only the valid Task 01 navigation.
- Feature verification MUST use Cypress only and cover at least 80% of this task's behavioral requirements.
</requirements>

## Subtasks

- [x] 4.1 Nest the existing customer and provider branches beneath the authenticated shell.
- [x] 4.2 Preserve token and role guard behavior at each branch boundary.
- [x] 4.3 Remove duplicate shared chrome from customer and provider wrappers.
- [x] 4.4 Preserve child-route order, titles, lazy loading, and dynamic parameters.
- [x] 4.5 Extend Cypress coverage for role-specific direct entry, denial redirects, responsive shell composition, and valid-menu parity.
- [x] 4.6 Run focused and relevant existing customer/provider browser journeys.

## Implementation Details

Follow the TechSpec sections "Router composition" and "Impact Analysis". Change layout ownership only; do not redesign customer/provider feature routes or add destinations hidden by Task 01.

### Relevant Files

- `apps/frontend/src/app/app.routes.ts` — customer/provider parent branches and role guards.
- `apps/frontend/src/app/modules/customer/customer.ts` — current `Page` import and feature wrapper.
- `apps/frontend/src/app/modules/customer/customer.html` — current nested shared chrome.
- `apps/frontend/src/app/modules/providers/provider.ts` — current `Page` import and feature wrapper.
- `apps/frontend/src/app/modules/providers/provider.html` — current nested shared chrome.
- `apps/frontend/cypress/e2e/adaptive-navigation.cy.ts` — role, direct-entry, denial, and duplication coverage.

### Dependent Files

- `apps/frontend/src/app/modules/customer/customer.routes.ts` — ordered customer route definitions to preserve.
- `apps/frontend/src/app/modules/providers/providers.routes.ts` — provider routes and full-path approval route.
- `apps/frontend/src/app/shared/guards/unauthorized/unauthorized.guard.ts` — unauthenticated redirect behavior.
- `apps/frontend/src/app/shared/guards/permission-by-role/permission-by-role.guard.ts` — cross-role redirect behavior.
- `apps/frontend/src/app/shared/enums/roles.enum.ts` — runtime API role values.
- `apps/frontend/src/app/shared/service/user-logged/user-logged.service.ts` — stored session consumed by guards.
- `apps/frontend/cypress/e2e/customer-journey.cy.ts` — existing customer regression flow.

### Related ADRs

- [ADR-001: Adopt Unified Adaptive Navigation](adrs/adr-001.md) — requires responsive parity for each authenticated role.
- [ADR-002: Centralize Authenticated Navigation in an Adaptive Shell](adrs/adr-002.md) — requires one shell while preserving routes and guards.
- [ADR-003: Verify Adaptive Navigation with Cypress End-to-End Tests](adrs/adr-003.md) — defines browser-only verification.

## Deliverables

- Customer and provider branches nested under the authenticated shell.
- Outlet-only customer and provider wrappers with no duplicate shared chrome.
- Preserved route ordering, guard behavior, lazy loading, and URLs.
- Cypress scenarios for both role branches, direct entry, denial, responsive layout, and menu parity.
- Unit tests: not applicable under ADR-003; no Jasmine/TestBed feature tests are added.
- Cypress behavioral requirement coverage >=80% **(REQUIRED)**.
- Focused and relevant regression Cypress scenarios passing **(REQUIRED)**.

## Tests

- Unit tests:
  - [x] Not applicable: ADR-003 requires Cypress-only verification for this feature.
- Integration tests:
  - [x] A `CLIENTE` session can directly enter `/customer`, `/customer/search`, `/customer/favorites`, and dynamic customer routes beneath one shell.
  - [x] A `PRESTADOR` session can directly enter `/provider` and `/provider/:orderId/aprovacao` beneath one shell.
  - [x] A customer entering `/provider` redirects to `/customer`; a provider entering `/customer` redirects to `/provider`.
  - [x] No-token entry to either branch redirects to `/authenticate/login` without authenticated chrome.
  - [x] Customer and provider pages each render one header, one navigation presentation, and one footer.
  - [x] At desktop width the persistent navigation is visible; at mobile width only the trigger/drawer presentation is available.
  - [x] Both roles show only Personal Data, Addresses, and Logout with the authenticated user ID.
  - [x] Specific customer routes retain precedence over the generic `:userId` route.
- Test coverage target: >=80% of stated behavioral requirements in Cypress.
- All tests must pass.

## Success Criteria

- All tests passing.
- Cypress behavioral requirement coverage >=80%.
- Customer/provider URLs and authorization behavior have no regression.
- Both branches render exactly one authenticated shell.
- Existing customer and provider browser journeys remain passing.
