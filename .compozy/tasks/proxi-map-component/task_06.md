---
status: completed
title: Add Search Mapping, Navigation, and Layout Test Coverage
type: frontend
complexity: medium
dependencies:
  - task_05
---

# Task 6: Add Search Mapping, Navigation, and Layout Test Coverage

## Overview

This task completes the customer search coverage after map integration. It verifies provider mapping, invalid-coordinate filtering, profile navigation, layout rendering, and preservation of existing favorites behavior.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST cover the search page provider-to-map adapter with valid and invalid coordinate inputs.
- MUST cover navigation triggered by map `viewProfile` events.
- MUST cover empty provider list behavior.
- MUST cover preservation of favorites loading and toggling behavior.
- SHOULD cover that the map is rendered in the expected search layout container.
- MUST keep search page tests compatible with existing mocked provider, user, route, and router dependencies.
</requirements>

## Subtasks

- [x] 6.1 Expand search page mocks to include provider coordinates and map display fields.
- [x] 6.2 Add tests for mapping valid providers into the map contract.
- [x] 6.3 Add tests for filtering providers with invalid coordinates.
- [x] 6.4 Add tests for map profile navigation.
- [x] 6.5 Add tests for empty state and provider list preservation.
- [x] 6.6 Run focused frontend validation and resolve in-scope regressions.

## Implementation Details

Use the existing `Search` spec as the base. Tests should verify the behavior introduced by task 05 and keep existing favorite-related assertions passing.

### Relevant Files

- `apps/frontend/src/app/modules/customer/search/search.spec.ts` — primary test file for search integration coverage.
- `apps/frontend/src/app/modules/customer/search/search.ts` — mapping, user location, and navigation behavior under test.
- `apps/frontend/src/app/modules/customer/search/search.html` — rendered map/list layout under test.
- `apps/frontend/src/app/modules/customer/search/search.scss` — responsive layout styles affected by integration.
- `apps/frontend/src/app/shared/components/ui/proxi-map/proxi-map.component.ts` — component event contract used by search.

### Dependent Files

- `apps/frontend/src/app/shared/service/provider/provider.ts` — mocked provider service contract used by search tests.
- `apps/frontend/src/app/shared/service/user-logged/user-logged.service.ts` — mocked user service used by current search tests.
- `apps/frontend/src/app/shared/service/geolocalization/geolocalization.ts` — may require mocking if search resolves user location through this service.

### Related ADRs

- [ADR-001: Hybrid Search Map Experience](adrs/adr-001.md) — validates list-plus-map behavior.
- [ADR-003: Local Map Provider Contract and Search Page Adaptation](adrs/adr-003.md) — validates mapping in the search page.

## Deliverables

- Expanded search page test coverage for map integration.
- Tests for mapping, invalid coordinate filtering, navigation, empty state, and favorites preservation.
- Focused frontend test run evidence.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for search page rendering and `viewProfile` handling **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Valid raw provider data produces a `ProxiMapProvider` with expected id, name, service, rating, price, and coordinates.
  - [ ] Providers with `lat` or `lng` missing, null, non-numeric, or zero-placeholder when invalid are excluded.
  - [ ] `viewProfile` handler calls router navigation with `/customer/:id`.
  - [ ] Favorites loading still runs for a signed-in user.
  - [ ] Favorite add/remove behavior remains unchanged after map integration.
- Integration tests:
  - [ ] Search fixture renders both the provider list and the map host container.
  - [ ] Empty results render the empty-state copy outside the map.
  - [ ] Search fixture can trigger the map output and observe router navigation.
- Test coverage target: >=80%
- All tests must pass

## Validation Notes

- Search page coverage was expanded in `search.spec.ts` for provider mapping, invalid-coordinate filtering, map profile navigation, empty state, layout rendering, and favorites preservation.
- Unit test execution and coverage measurement were intentionally skipped by product direction.
- `npx tsc --noEmit -p tsconfig.spec.json` was run as non-test validation. The command no longer reports errors in `search.spec.ts`; remaining failures are pre-existing spec issues outside this task scope in profile, card-detail, mask, guard, and category specs.
- Angular build executed successfully with `npm run build -- --verbose`.

## Success Criteria

- All tests passing
- Test coverage >=80%
- Search integration regressions are covered by focused tests.
- Existing favorites tests remain green.
- Map integration behavior is verifiable without real Leaflet rendering.
