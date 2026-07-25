---
status: pending
title: Add accessible provider-home completion CTA
type: frontend
complexity: high
dependencies:
  - task_13
---

# Task 15: Add accessible provider-home completion CTA

## Overview
Add a prominent, accessible completion CTA to the provider home that distinguishes payout blockers from recommended profile improvements and directs providers into the centralized journey. The card must reflect the shared completion state across loading, failure, payout-blocked, recommended-only, and fully complete conditions without disrupting existing operational dashboard content.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- 1. The provider home MUST load and consume the signal-based completion resource from task 13 and MUST NOT derive checklist state from `UserLoggedService` or the provider-home login aggregate.
- 2. The CTA MUST appear whenever `allComplete` is false, remain visible in the recommended-only state, and be absent when all five checklist items are complete.
- 3. When `payoutReady` is false, the card MUST give the required payout group and its next incomplete financial item greater visual and reading-order priority than recommended items.
- 4. When payout is ready but recommended items remain, the card MUST clearly confirm payment readiness and describe the remaining items as optional profile strengthening rather than payment blockers.
- 5. The CTA MUST display separate required and recommended progress from the server response and MUST navigate through the frontend-owned destination for the centralized completion journey.
- 6. Loading MUST avoid presenting false completion or blocker claims; an initial-load error MUST show a non-sensitive recoverable message and keyboard-operable retry action without hiding the rest of the provider dashboard.
- 7. Status, completion, priority, and errors MUST not rely on color alone; progress and interactive controls MUST provide appropriate accessible names, focus indication, semantic status, and keyboard operation.
- 8. The card MUST remain usable at supported mobile widths without horizontal scrolling, clipped actions, or reordered meaning.
- 9. Customers, administrators, public pages, and other non-provider surfaces MUST NOT render or request the provider-home completion CTA.
</requirements>

## Subtasks
- [ ] 15.1 Integrate the provider home with the shared completion state lifecycle and retry behavior.
- [ ] 15.2 Present payout-blocked state with required progress and the next incomplete financial action prioritized.
- [ ] 15.3 Present payout-ready/recommended-only state with non-blocking guidance and separate recommended progress.
- [ ] 15.4 Hide the CTA after complete state while preserving the existing provider dashboard layout and behavior.
- [ ] 15.5 Connect the CTA and item actions to frontend-owned centralized journey destinations.
- [ ] 15.6 Provide semantic, keyboard, focus, screen-reader, and responsive behavior for every visible state.
- [ ] 15.7 Add component, integration, accessibility, viewport, and E2E coverage for provider and non-provider behavior.

## Implementation Details
Extend the current standalone provider home page and its existing template/styles rather than creating a parallel dashboard. Consume only the public read-only state and load/retry operations from task 13. Refer to the TechSpec “Data Flow,” “Frontend” testing guidance, and PRD “Provider-home CTA,” “Progress communication,” and “Completion state” sections.

Place the CTA near the welcome/summary region so payout blockers appear before performance analytics while keeping the current request, order, revenue, and insight interactions intact. Use the centralized route delivered by task 14 and the stable frontend item mapping from task 13; never consume navigation URLs from the API. This task owns home presentation only and must not duplicate domain forms or completion calculations.

### Relevant Files
- `apps/frontend/src/app/modules/providers/home/home.ts` — Existing provider dashboard component and lifecycle.
- `apps/frontend/src/app/modules/providers/home/home.html` — Existing dashboard reading order where the CTA will be presented.
- `apps/frontend/src/app/modules/providers/home/home.scss` — Existing responsive provider-dashboard visual system.
- `apps/frontend/src/app/modules/providers/home/home.spec.ts` — Current provider-home component and behavior test suite.

### Dependent Files
- `apps/frontend/src/app/modules/providers/providers.routes.ts` — Provider route tree containing the centralized completion destination from task 14.
- `apps/frontend/src/app/modules/customer/customer.routes.ts` — Non-provider route boundary used to verify the CTA is not exposed to customers.
- `apps/frontend/cypress/e2e/home.cy.ts` — Existing home E2E coverage to extend with provider completion scenarios.

### Related ADRs
- [ADR-001: Centralized Provider Profile Completion Journey](adrs/adr-001.md) — Defines the persistent two-group CTA and centralized checklist experience.
- [ADR-003: Server-Derived Profile Completion Resource](adrs/adr-003.md) — Requires the home to consume independently refreshable server state and use frontend-owned navigation.

## Deliverables
- Provider-home CTA integrated with task 13 query state and task 14 centralized journey.
- Distinct payout-blocked, payout-ready/recommended-only, complete, loading, and recoverable-error presentations.
- Separate required and recommended progress with required payout actions prioritized when blocking.
- Accessible semantics, announcements, retry behavior, keyboard navigation, visible focus, and color-independent status cues.
- Responsive card behavior across supported mobile and desktop widths without regressing existing dashboard content.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for provider-home completion state and navigation **(REQUIRED)**
- E2E tests for critical provider and non-provider CTA flows **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Initial loading renders a neutral accessible loading state and does not claim payout readiness, incompleteness, or 100% progress.
  - [ ] A bank-and-Pix-pending response renders both groups, places required payout content first, and identifies the first pending financial action.
  - [ ] A payout-ready response with pending photo, social links, or address confirms payment readiness and labels remaining work as recommended.
  - [ ] An `allComplete: true` response removes the CTA while existing summary, requests, active orders, revenue, and insights remain rendered.
  - [ ] Required and recommended progress expose correct accessible names and values and remain understandable with color styling disabled.
  - [ ] Initial-load failure preserves the dashboard, renders an alert/status message without backend internals, and retry invokes a forced completion refetch once.
  - [ ] CTA links use the frontend route mapping and ignore unexpected route-like properties in response fixtures.
  - [ ] Every button and link is reachable and operable by keyboard with visible focus and a unique accessible name.
- Integration tests:
  - [ ] Provider-home initialization requests completion through task 13 once and reacts to a refreshed shared signal without reauthentication.
  - [ ] Activating the main CTA navigates to the centralized provider completion route from payout-blocked and recommended-only states.
  - [ ] A retry that succeeds replaces the error state with current progress, while a repeated failure remains recoverable.
  - [ ] Completion API failure does not block existing order loading or provider request actions.
  - [ ] Customer and non-provider route components neither instantiate the provider completion state nor render CTA text or controls.
- End-to-end tests:
  - [ ] A provider with an incomplete bank account sees the prioritized payment requirement and reaches the centralized completion journey using keyboard only.
  - [ ] A payout-ready provider with one recommended item still sees the CTA and clear non-blocking language.
  - [ ] A fully complete provider does not see the CTA at desktop or mobile viewport sizes.
  - [ ] A simulated completion-query failure shows retry; a successful retry restores the card without page reload.
  - [ ] A customer session never sees the provider completion CTA after navigating across customer home and profile routes.
  - [ ] At the smallest supported mobile viewport the card has no horizontal overflow, clipped text, unreachable action, or altered semantic reading order.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Providers with any pending item see the CTA, while providers with all five items complete do not.
- Providers can distinguish payment blockers from optional profile improvements without relying on color.
- Completion-query errors remain recoverable and never prevent use of the rest of the home dashboard.
- All CTA actions work with keyboard and screen-reader semantics across supported mobile and desktop layouts.
- No non-provider surface renders the CTA or initiates its completion request.
