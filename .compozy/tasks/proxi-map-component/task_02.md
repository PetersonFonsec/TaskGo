---
status: completed
title: Create ProxiMapComponent Contract and SSR-Safe Shell
type: frontend
complexity: medium
dependencies:
  - task_01
---

# Task 2: Create ProxiMapComponent Contract and SSR-Safe Shell

## Overview

This task creates the reusable standalone map component shell and its public contract. It establishes typed inputs, the `viewProfile` output, browser-only guards, and basic fallback markup without implementing full Leaflet marker behavior yet.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `ProxiMapComponent` under `apps/frontend/src/app/shared/components/ui/proxi-map`.
- MUST create separate TypeScript, HTML, SCSS, and spec files.
- MUST expose `ProxiMapProvider` and `ProxiMapLocation` interfaces from the component TypeScript file.
- MUST expose typed `providers` and `userLocation` inputs matching the TechSpec "Core Interfaces" section.
- MUST expose a `viewProfile` output that emits the selected provider id.
- MUST guard browser-specific behavior with Angular platform detection.
- MUST render a useful fallback state when user location is unavailable or browser-only map initialization is not possible.
</requirements>

## Subtasks

- [x] 2.1 Create the `shared/components/ui/proxi-map` component files.
- [x] 2.2 Define the exported map provider and user-location interfaces.
- [x] 2.3 Add typed inputs and output following the existing standalone component style.
- [x] 2.4 Add platform detection and lifecycle placeholders for browser-only map initialization.
- [x] 2.5 Add accessible shell markup for map container and fallback states.
- [x] 2.6 Add component styles for base dimensions, empty state, and mobile-safe rendering.

## Implementation Details

Follow the existing Angular standalone patterns used by shared UI components. The shell should prepare the lifecycle boundary required by the TechSpec but avoid implementing full marker and popup behavior until task 03.

### Relevant Files

- `apps/frontend/src/app/shared/components/ui/button/button.component.ts` — example of standalone component style using Angular input APIs.
- `apps/frontend/src/app/shared/components/ui/card-detail/card-detail.ts` — example of shared UI component inputs and outputs.
- `apps/frontend/src/app/shared/service/geolocalization/geolocalization.ts` — example of browser/platform-safe logic.
- `apps/frontend/src/app/shared/components/ui/proxi-map/proxi-map.component.ts` — new component TypeScript file to create.
- `apps/frontend/src/app/shared/components/ui/proxi-map/proxi-map.component.html` — new component template file to create.
- `apps/frontend/src/app/shared/components/ui/proxi-map/proxi-map.component.scss` — new component stylesheet file to create.
- `apps/frontend/src/app/shared/components/ui/proxi-map/proxi-map.component.spec.ts` — new component test file to create.

### Dependent Files

- `apps/frontend/src/app/modules/customer/search/search.ts` — future consumer of the exported interfaces and component.
- `apps/frontend/src/app/modules/customer/search/search.html` — future consumer template.

### Related ADRs

- [ADR-002: Shared UI Component with Browser-Only Leaflet Loading](adrs/adr-002.md) — defines location and SSR-safe component boundary.
- [ADR-003: Local Map Provider Contract and Search Page Adaptation](adrs/adr-003.md) — defines the local map contract.

## Deliverables

- New standalone `ProxiMapComponent` shell in the shared UI folder.
- Exported `ProxiMapProvider` and `ProxiMapLocation` interfaces.
- Typed inputs and `viewProfile` output.
- Browser/platform guard established for future Leaflet loading.
- Accessible fallback markup and baseline styles.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for component creation inside Angular TestBed **(REQUIRED)**

## Tests

- Unit tests:
  - [x] Component creates successfully with no providers and null user location.
  - [x] Component accepts a valid `userLocation` input without throwing.
  - [x] Component accepts a provider list matching the local contract.
  - [x] Component does not attempt browser-only initialization on a non-browser platform.
  - [x] Fallback text or state renders when `userLocation` is null.
- Integration tests:
  - [x] Angular TestBed imports the standalone component without declaring it in a module.
  - [x] Template renders a map container element with an accessible label or role.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Component files exist in the approved shared UI path.
- Public component contract matches the TechSpec.
- No Leaflet DOM work runs during server-side rendering.

Validation note: the component spec type-checks in isolation and the Angular build passes. The full Angular Karma test command is currently blocked by pre-existing unrelated spec compile errors in profile, card-detail, mask, guard, and category tests.
