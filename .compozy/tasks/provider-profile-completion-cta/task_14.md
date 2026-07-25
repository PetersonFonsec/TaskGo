---
status: pending
title: Build the centralized provider completion journey
type: frontend
complexity: high
dependencies:
  - task_13
---

# Task 14: Build the centralized provider completion journey

## Overview
Build a lazy-loaded standalone provider page that presents the complete profile journey in two clearly separated groups: payout requirements and recommended profile enrichment. The page must consume the task-13 shared completion state, prioritize unresolved financial actions, connect every checklist item to its focused form or destination, and remain usable through loading, failure, retry, mutation, keyboard, screen-reader, and responsive states.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. `ProvidersRoutes` MUST expose a static, provider-guarded `profile-completion` route that lazy-loads a standalone completion page within the authenticated provider shell.
- 2. The page MUST consume the task-13 completion service as its only checklist source and MUST NOT derive completion from the login session, local storage, form submission alone, or duplicated frontend rules.
- 3. The page MUST render separate “Required to receive payments” and “Strengthen your profile” sections with independent completed/total progress, explicit status labels, and explanatory copy.
- 4. The bank account MUST appear before all recommended items and its unresolved action MUST receive the strongest visual and focus priority.
- 5. Photo, social links, and address actions MUST remain visibly recommended and MUST NOT imply that they block payout readiness.
- 6. Each of the five stable item identifiers MUST resolve to exactly one actionable experience owned by the frontend: an in-page focused form or the task-13 application route/link for that domain.
- 7. The financial form MUST use the focused bank client and idempotency behavior from task 13; social editing MUST cover WhatsApp, Instagram, Facebook, and LinkedIn; photo editing MUST submit multipart image data; address navigation or editing MUST use authenticated `/user/me` behavior.
- 8. Successful domain actions MUST rely on task 13 to invalidate/refetch completion and then render server-confirmed status; the page MUST NOT mark an item complete optimistically.
- 9. The page MUST prevent duplicate submissions, preserve user-entered non-sensitive values after recoverable errors, clear sensitive financial fields when required for safety, and display actionable domain errors without exposing raw gateway or storage details.
- 10. Initial loading MUST expose an accessible status without showing false progress; first-load failure MUST offer retry; refresh failure MUST preserve the last valid checklist and offer retry without replacing it with an empty state.
- 11. Completion, processing, error, and pending states MUST use text or accessible labels in addition to color, and dynamic progress/result changes MUST be announced without moving focus unexpectedly.
- 12. All controls MUST have programmatic labels, visible keyboard focus, logical heading order, keyboard operation, and no color-only meaning; the layout MUST remain usable at supported mobile and desktop widths.
- 13. When all five items are server-confirmed complete, the page MUST present a concise completed state and a clear route back to the provider home or regular profile-management destinations.
- 14. Customer users MUST remain unable to activate the provider journey through route access, and backend route URLs MUST never override task-13 frontend-owned item destinations.
</requirements>

## Subtasks
- [ ] 14.1 Add the guarded lazy provider route and standalone page shell for the completion journey.
- [ ] 14.2 Present independent required and recommended progress with payout blockers prioritized and clearly explained.
- [ ] 14.3 Connect the bank-account action to its focused validated financial form and server-confirmed refresh behavior.
- [ ] 14.4 Connect photo, structured social, and address actions to their focused forms or frontend-owned destinations.
- [ ] 14.5 Present deterministic loading, refreshing, processing, complete, recoverable-error, retry, and all-complete states.
- [ ] 14.6 Meet keyboard, screen-reader, focus, status-announcement, color-independence, and responsive-layout requirements.
- [ ] 14.7 Add component, routing, integration, and simulated-API E2E coverage for the full journey.

## Implementation Details
Follow the TechSpec sections **Component Overview**, **Data Flow**, **User Experience**, and **Testing Approach**. Add one focused page under the provider feature and use the task-13 read-only completion signals, domain clients, invalidation behavior, and exhaustive item-to-destination mapping. Do not add another completion cache, mutate login state, accept backend-provided route URLs, or reproduce backend completion calculations.

Keep the route static and before any future catch-all provider parameter routes. The page may render compact in-page editors for bank account, social links, and photo where task-13 clients support them; address actions may route to the authenticated address experience through the approved frontend mapping. Every action must remain within the centralized journey context through clear return/navigation behavior.

Use simulated backend responses in Cypress so CI never calls Pagar.me or durable production storage. Exercise state transitions by intercepting completion and mutation endpoints, including updated completion payloads after a successful mutation.

### Relevant Files
- `apps/frontend/src/app/modules/providers/providers.routes.ts` — Existing provider-scoped route table where the guarded lazy static journey route belongs.
- `apps/frontend/src/app/modules/providers/profile-completion/profile-completion.page.ts` — Standalone page state, domain action coordination, retry behavior, and accessibility announcements.
- `apps/frontend/src/app/modules/providers/profile-completion/profile-completion.page.html` — Required/recommended progress, forms, links, status copy, and accessible state rendering.
- `apps/frontend/src/app/modules/providers/profile-completion/profile-completion.page.scss` — Financial priority, visible focus, non-color status cues, and responsive layout.
- `apps/frontend/src/app/shared/service/provider/profile-completion.ts` — Task-13 query state, domain clients, refresh behavior, and frontend-owned destinations consumed by the page.

### Dependent Files
- `apps/frontend/src/app/modules/providers/profile-completion/profile-completion.page.spec.ts` — Component and integration coverage for rendering, actions, retries, announcements, and server-confirmed state.
- `apps/frontend/cypress/e2e/provider-profile-completion.cy.ts` — Simulated-API journey coverage for provider access, mutations, progress refresh, errors, keyboard behavior, and responsive layout.

### Related ADRs
- [ADR-001: Centralized Provider Profile Completion Journey](adrs/adr-001.md) — Selects one coherent journey with separate payout and enrichment checklists and persistent financial priority.
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — Requires the page to consume one refreshable server-derived state while retaining focused domain mutations and frontend-owned destinations.

## Deliverables
- Lazy provider-only `profile-completion` route and standalone centralized completion page.
- Separate accessible payout-required and profile-recommended groups with independent server-derived progress.
- Actionable bank-account, photo, social-link, and address experiences using task-13 clients and navigation.
- Deterministic loading, refreshing, processing, error, retry, partial-completion, and all-complete UI states.
- Responsive, keyboard-operable, screen-reader-friendly presentation with explicit non-color status communication.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for completion state, domain actions, routing, refresh, and accessibility **(REQUIRED)**
- E2E tests with simulated completion, payout, social, photo, and address APIs **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Initial loading renders an announced loading status and no fabricated zero-percent or completed progress.
  - [ ] A loaded response renders the bank account under the required group and photo, social links, and address under the recommended group.
  - [ ] Required and recommended completed/total values render independently, with unfinished financial actions ordered before recommended actions.
  - [ ] Payout-ready with recommended items pending states that payment requirements are complete while preserving recommended actions.
  - [ ] Pix explanatory copy identifies the key as a TaskGo payment requirement and does not describe it as a Brazilian regulatory requirement.
  - [ ] Every canonical item ID renders exactly one action using the task-13 frontend mapping, while an unknown runtime value cannot navigate to a backend URL.
  - [ ] First-load failure renders an alert and retry control; retry reloads completion and replaces the error after success.
  - [ ] Refresh failure preserves the previous checklist, announces the recoverable failure, and permits another refresh.
  - [ ] Processing disables only the active action, blocks duplicate submission, and exposes a textual busy status.
  - [ ] A completed mutation does not mark its item complete until the refetched server response reports completion.
  - [ ] All-complete state provides navigation back to provider home and does not render unresolved-action controls.
- Integration tests:
  - [ ] Submitting a valid bank form calls the exact task-13 client with no provider/user ID and observes refreshed required progress.
  - [ ] Social submission includes canonical WhatsApp, Instagram, Facebook, and LinkedIn fields and updates only after server-confirmed refetch.
  - [ ] Photo submission sends the selected image through the multipart client and exposes safe validation/storage errors without leaking internal details.
  - [ ] Address action uses the frontend-owned authenticated address destination and never accepts a backend-provided URL or acting `userId`.
  - [ ] `400`, `409`, `422`, and transient gateway failures retain appropriate form state, expose an actionable message, and leave the last valid checklist visible.
  - [ ] Keyboard traversal reaches groups and actions in logical order, visible focus remains present, and loading/progress/success/error changes are announced.
  - [ ] Routing resolves the lazy page for a provider and the existing role guard rejects a customer.
- End-to-end tests:
  - [ ] A provider with five pending simulated items sees two progress groups and reaches the bank action before recommended actions using only the keyboard.
  - [ ] A simulated successful bank mutation followed by an updated completion response changes payout readiness without reauthentication or page reload.
  - [ ] Simulated photo, social, and address completion updates recommended progress and eventually renders the all-complete state.
  - [ ] A simulated gateway rejection shows safe recovery guidance, preserves the checklist, and succeeds after retry with a new accepted response.
  - [ ] A customer session cannot open the provider completion route.
  - [ ] The journey remains readable and operable at the project’s supported mobile and desktop viewport presets.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Providers can identify the exact payment blockers and recommended profile actions from one centralized page.
- The bank-account requirement remains visually, semantically, and navigationally prioritized over optional enrichment.
- Every successful action displays completion only after the shared service receives server-confirmed state.
- Loading and recoverable failures never fabricate or discard an existing valid progress snapshot.
- All five actions are keyboard-operable, screen-reader-labeled, responsive, and independent of color-only communication.
- Cypress completes the full journey with simulated APIs and no real Pagar.me or production file-storage calls.
