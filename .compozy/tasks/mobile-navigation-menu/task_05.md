---
status: pending
title: Migrate authenticated order routes and complete adaptive navigation regression
type: refactor
complexity: high
dependencies:
  - task_03
  - task_04
---

# Task 05: Migrate authenticated order routes and complete adaptive navigation regression

## Overview

Move all five authenticated order routes beneath the shared shell while preserving route precedence, lazy components, titles, and the customer/provider guard matrix. Complete the cross-application Cypress regression for mobile, desktop, accessibility, authorization, valid navigation, and the 200 ms drawer target.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Payment, review, confirm, finish, and shared order-detail routes MUST become children of the authenticated shell without changing public paths.
- Specific order-action routes MUST remain before the generic `orders/:id` route.
- Existing titles, lazy-loaded page components, route parameters, and leaf guards MUST remain unchanged.
- Customer users MUST retain access to payment, review, confirm, and shared details but not finish.
- Provider users MUST retain access to finish and shared details but not customer-only order actions.
- Unauthenticated order entry MUST redirect to authentication without rendering authenticated chrome.
- Every authenticated order screen MUST expose exactly one responsive navigation presentation.
- Final regression MUST verify only the valid Personal Data, Addresses, and Logout items and MUST keep unavailable destinations hidden.
- Mobile drawer opening MUST require no network request and complete within 200 ms without fixed waits.
- Feature verification MUST use Cypress only and cover at least 80% of this task's behavioral requirements.
</requirements>

## Subtasks

- [ ] 5.1 Nest all five authenticated order routes under the shared shell.
- [ ] 5.2 Preserve route precedence, titles, lazy components, parameters, and guard semantics.
- [ ] 5.3 Verify allowed, denied, and unauthenticated direct entry for each order action.
- [ ] 5.4 Complete the final mobile drawer accessibility, dismissal, active-state, and performance matrix.
- [ ] 5.5 Complete desktop parity, valid-menu, and single-shell regression coverage.
- [ ] 5.6 Verify that public and authentication routes remain outside authenticated chrome.
- [ ] 5.7 Run the focused and full frontend Cypress suites and the frontend production build.

## Implementation Details

Follow the TechSpec sections "Router composition", "Cypress End-to-End Tests", and "Development Sequencing". Keep order page implementations unchanged unless route nesting reveals a proven parameter regression.

### Relevant Files

- `apps/frontend/src/app/app.routes.ts` — five current top-level order routes and their guards.
- `apps/frontend/cypress/e2e/adaptive-navigation.cy.ts` — consolidated final browser regression matrix.

### Dependent Files

- `apps/frontend/src/app/shared/guards/unauthorized/unauthorized.guard.ts` — no-token order redirect behavior.
- `apps/frontend/src/app/shared/guards/permission-by-role/permission-by-role.guard.ts` — customer/provider order authorization.
- `apps/frontend/src/app/shared/service/utils/utils.service.ts` — role-home redirect mapping.
- `apps/frontend/src/app/shared/service/order/order.ts` — order-page API calls requiring Cypress stubs.
- `apps/frontend/src/app/modules/orders/order-payment/order-payment.page.ts` — consumes order route parameters.
- `apps/frontend/src/app/modules/orders/review-order/review-order.page.ts` — consumes order route parameters and review tags.
- `apps/frontend/src/app/modules/orders/confirm-service/confirm-service.page.ts` — consumes order route parameters.
- `apps/frontend/src/app/modules/orders/finish-service/finish-service.page.ts` — provider-only route consumer.
- `apps/frontend/src/app/modules/orders/order-details/order-details.page.ts` — shared details route consumer.
- `apps/frontend/cypress/e2e/booking.cy.ts` — authenticated order/session stubbing patterns.

### Related ADRs

- [ADR-001: Adopt Unified Adaptive Navigation](adrs/adr-001.md) — requires navigation on every authenticated order screen.
- [ADR-002: Centralize Authenticated Navigation in an Adaptive Shell](adrs/adr-002.md) — requires order routes inside the shell with guards preserved.
- [ADR-003: Verify Adaptive Navigation with Cypress End-to-End Tests](adrs/adr-003.md) — defines the final browser regression scope and timing target.

## Deliverables

- All authenticated order routes nested beneath the shared shell.
- Preserved route order, URLs, titles, lazy loading, parameters, and authorization matrix.
- Complete adaptive-navigation Cypress matrix across roles, routes, viewports, keyboard behavior, and performance.
- Passing focused and full frontend Cypress suites and frontend production build.
- Unit tests: not applicable under ADR-003; no Jasmine/TestBed feature tests are added.
- Cypress behavioral requirement coverage >=80% **(REQUIRED)**.
- All verification commands passing **(REQUIRED)**.

## Tests

- Unit tests:
  - [ ] Not applicable: ADR-003 requires Cypress-only verification for this feature.
- Integration tests:
  - [ ] Customer direct entry succeeds for payment, review, confirm, and shared details; finish redirects to `/customer`.
  - [ ] Provider direct entry succeeds for finish and shared details; payment, review, and confirm redirect to `/provider`.
  - [ ] No-token direct entry to every order URL redirects to `/authenticate/login` without shell chrome.
  - [ ] Every allowed order URL renders one header, one responsive navigation presentation, and one footer.
  - [ ] At 375×667, the trigger opens the drawer in one action and the open marker appears within 200 ms without a network request.
  - [ ] Mobile focus enters and remains inside the drawer; Escape and backdrop restore trigger focus.
  - [ ] Selecting a valid personal destination closes the drawer, uses the stored user ID, and exposes active state plus `aria-current`.
  - [ ] At 1280×800, persistent navigation is visible and the mobile trigger/drawer are absent.
  - [ ] Desktop and mobile show only Personal Data, Addresses, and Logout in the same order.
  - [ ] Institutional and authentication routes contain no authenticated shell controls.
- Test coverage target: >=80% of stated behavioral requirements in Cypress.
- All tests must pass.

## Success Criteria

- All tests passing.
- Cypress behavioral requirement coverage >=80%.
- All five order URLs preserve their current route and authorization behavior.
- Every authenticated route family renders the same valid adaptive navigation.
- Drawer opening completes in no more than 200 ms.
- Full frontend Cypress suite and production build pass.
