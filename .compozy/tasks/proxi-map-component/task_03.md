---
status: completed
title: Implement Leaflet Map Lifecycle, Markers, Popups, and Bounds
type: frontend
complexity: high
dependencies:
  - task_02
---

# Task 3: Implement Leaflet Map Lifecycle, Markers, Popups, and Bounds

## Overview

This task implements the actual Leaflet behavior inside the reusable map component. It covers OpenStreetMap tiles, user and provider markers, popups, custom Proxi styling, bounds calculation, updates when inputs change, and cleanup on destroy.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST dynamically load Leaflet only in the browser after the component view is initialized.
- MUST render OpenStreetMap tiles with visible attribution.
- MUST render a distinct marker for the current user location.
- MUST render provider markers using Proxi purple `#6D28D9`.
- MUST visually distinguish premium or verified providers when flags are available.
- MUST render provider popups with name, service, rating, distance, starting price, trust cues, and a "Ver perfil" action.
- MUST emit `viewProfile` with the provider id when the popup action is selected.
- MUST recalculate bounds to include user and provider markers whenever relevant inputs change.
- MUST update markers when the provider list changes.
- MUST remove Leaflet map resources in `ngOnDestroy`.
- MUST avoid broken default Leaflet marker icons by using custom icons or explicitly configured assets.
</requirements>

## Subtasks

- [x] 3.1 Add browser-only dynamic Leaflet loading and map initialization.
- [x] 3.2 Add OpenStreetMap tile layer with required attribution.
- [x] 3.3 Render the user location marker and provider markers.
- [x] 3.4 Add provider popup content and bridge popup profile actions to the Angular output.
- [x] 3.5 Recalculate bounds when user location or providers change.
- [x] 3.6 Refresh marker layers when provider data changes.
- [x] 3.7 Destroy map, layers, and event handlers during component cleanup.

## Implementation Details

Implement the behavior specified by the TechSpec "Integration Points" and "Technical Considerations" sections. Keep Leaflet-specific state private to the component and keep the public API limited to inputs and `viewProfile`.

### Relevant Files

- `apps/frontend/src/app/shared/components/ui/proxi-map/proxi-map.component.ts` — main Leaflet lifecycle, marker, popup, output, and cleanup logic.
- `apps/frontend/src/app/shared/components/ui/proxi-map/proxi-map.component.html` — map container and fallback rendering.
- `apps/frontend/src/app/shared/components/ui/proxi-map/proxi-map.component.scss` — custom marker, popup, and responsive map styling.
- `apps/frontend/angular.json` — confirms Leaflet CSS is globally available from task 01.
- `.compozy/tasks/proxi-map-component/_techspec.md` — authoritative design for SSR boundary and marker behavior.

### Dependent Files

- `apps/frontend/src/app/shared/components/ui/proxi-map/proxi-map.component.spec.ts` — must be expanded in task 04 to cover this behavior.
- `apps/frontend/src/app/modules/customer/search/search.html` — future integration point for rendering this component.
- `apps/frontend/src/app/modules/customer/search/search.ts` — future integration point for handling `viewProfile`.

### Related ADRs

- [ADR-002: Shared UI Component with Browser-Only Leaflet Loading](adrs/adr-002.md) — requires dynamic browser-only loading.
- [ADR-003: Local Map Provider Contract and Search Page Adaptation](adrs/adr-003.md) — keeps marker rendering based on the local provider contract.

## Deliverables

- Leaflet map initializes only in browser contexts.
- OpenStreetMap tiles render with attribution.
- User and provider markers render with custom Proxi visual treatment.
- Provider popups include the required details and "Ver perfil" action.
- `viewProfile` emits the selected provider id.
- Marker updates, bounds recalculation, and map cleanup are implemented.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for marker/popup behavior with mocked Leaflet **(REQUIRED)**

## Tests

- Unit tests:
  - [x] Browser platform initializes the map after the view exists.
  - [x] Non-browser platform skips dynamic Leaflet initialization.
  - [x] User marker is created when `userLocation` has valid coordinates.
  - [x] Provider markers are created only for providers with valid numeric coordinates.
  - [x] Premium or verified providers receive differentiated marker or popup treatment.
  - [x] Popup profile action emits the matching provider id.
  - [x] Provider input changes rebuild the marker layer.
  - [x] `ngOnDestroy` removes the map instance and event handlers.
- Integration tests:
  - [x] Component with one user location and two providers fits bounds including all valid points.
  - [x] Component with no providers keeps the user marker and empty state behavior intact.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- The map renders user and provider locations with OpenStreetMap attribution.
- The component updates correctly when provider inputs change.
- Leaflet resources are cleaned up on component destroy.

Validation note: unit test execution and coverage measurement are deferred by product direction. The implementation was validated with isolated TypeScript checks and Angular build verification.
