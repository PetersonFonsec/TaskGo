---
status: completed
title: Integrate ProxiMapComponent into Customer Search
type: frontend
complexity: high
dependencies:
  - task_03
---

# Task 5: Integrate ProxiMapComponent into Customer Search

## Overview

This task connects the reusable map component to the customer search page. It adapts the current provider response into the map contract, supplies user location, handles profile navigation, and updates the search layout for the hybrid list-plus-map experience.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST import and render `ProxiMapComponent` in the customer search page.
- MUST adapt raw providers into `ProxiMapProvider[]` before passing them to the component.
- MUST filter providers without valid numeric latitude and longitude.
- MUST provide safe fallbacks for missing name, service, rating, price, distance, premium, and verified fields.
- MUST provide user location from existing app data or the `Geolocalization` service.
- MUST handle `viewProfile` by navigating to `/customer/:id`.
- MUST preserve existing provider list and favorites behavior.
- MUST update search layout for desktop split view and compact mobile map.
- MUST show a discreet empty-state message outside the map when no providers are available.
</requirements>

## Subtasks

- [x] 5.1 Import the map component and map interfaces into the search page.
- [x] 5.2 Add provider-to-map adapter logic with defensive fallbacks.
- [x] 5.3 Provide the current user location to the map.
- [x] 5.4 Handle map profile intent by navigating to the provider profile route.
- [x] 5.5 Render the map in the search template beside the existing provider list.
- [x] 5.6 Update search SCSS for desktop split and mobile compact behavior.
- [x] 5.7 Preserve existing favorites and provider list behavior.

## Implementation Details

Follow the TechSpec "Customer Search Page" integration guidance. The search page should own data adaptation and navigation; `ProxiMapComponent` should remain unaware of routes and API response shapes.

### Relevant Files

- `apps/frontend/src/app/modules/customer/search/search.ts` — provider loading, favorites state, route navigation, and new map adapter.
- `apps/frontend/src/app/modules/customer/search/search.html` — search layout and map component placement.
- `apps/frontend/src/app/modules/customer/search/search.scss` — responsive layout and compact mobile map styling.
- `apps/frontend/src/app/modules/customer/customer.routes.ts` — confirms profile route shape `/customer/:userId`.
- `apps/frontend/src/app/shared/service/geolocalization/geolocalization.ts` — existing browser-safe current location source.
- `apps/frontend/src/app/shared/components/ui/proxi-map/proxi-map.component.ts` — component contract to consume.

### Dependent Files

- `apps/frontend/src/app/modules/customer/search/search.spec.ts` — must be updated in task 06 for mapping and navigation coverage.
- `apps/frontend/src/app/shared/service/provider/provider.ts` — existing provider search service should remain compatible.
- `apps/frontend/src/app/shared/components/ui/card-detail/card-detail.ts` — existing provider list card usage should continue working.

### Related ADRs

- [ADR-001: Hybrid Search Map Experience](adrs/adr-001.md) — requires list primary with map as location context.
- [ADR-003: Local Map Provider Contract and Search Page Adaptation](adrs/adr-003.md) — requires adaptation in the search page.

## Deliverables

- Customer search renders `app-proxi-map` with user location and mapped providers.
- Search page maps provider API data into the local map contract.
- Search page navigates to `/customer/:id` when `viewProfile` emits.
- Search layout supports desktop split and compact mobile map behavior.
- Existing favorites and provider list flows remain functional.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for search page rendering and map event handling **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Provider with valid `lat` and `lng` is included in map providers.
  - [ ] Provider without valid coordinates is excluded from map providers.
  - [ ] Missing provider display fields receive safe fallback values.
  - [ ] `viewProfile` handler navigates to `/customer/:id`.
  - [ ] Existing favorites toggle still calls add/remove favorite services.
- Integration tests:
  - [ ] Search template renders `app-proxi-map` when user location is available.
  - [ ] Search template renders the provider list after map integration.
  - [ ] Empty provider results show the discreet empty-state message outside the map.
- Test coverage target: >=80%
- All tests must pass

## Validation Notes

- Angular build executed successfully with `npm run build -- --verbose`.
- Unit and integration test execution is intentionally deferred by product direction; task 06 remains responsible for search mapping, navigation, and layout test coverage.

## Success Criteria

- All tests passing
- Test coverage >=80%
- Customer search shows the map without removing the provider list.
- Profile navigation from the map is handled by the search page.
- Existing search and favorites behavior is preserved.
