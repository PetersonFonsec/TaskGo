---
status: completed
title: Add ProxiMapComponent Unit Coverage
type: frontend
complexity: medium
dependencies:
  - task_03
---

# Task 4: Add ProxiMapComponent Unit Coverage

## Overview

This task completes focused unit coverage for the reusable map component after full Leaflet behavior exists. The tests should isolate Angular behavior from real map rendering by mocking Leaflet at the component boundary.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST cover component creation, SSR guard behavior, map initialization, marker rendering, popup action, bounds updates, and cleanup.
- MUST mock Leaflet so tests do not depend on network, tile loading, or real DOM map rendering.
- MUST verify invalid provider coordinates are ignored.
- MUST verify empty-provider behavior still renders user context.
- MUST keep tests compatible with Angular standalone TestBed imports.
- MUST preserve at least 80% coverage for the component.
</requirements>

## Subtasks

- [x] 4.1 Add or expand Leaflet mocks used by the component tests.
- [x] 4.2 Cover browser and non-browser lifecycle behavior.
- [x] 4.3 Cover marker creation for user and providers.
- [x] 4.4 Cover popup profile event emission.
- [x] 4.5 Cover provider updates, bounds recalculation, and cleanup.
- [x] 4.6 Record coverage measurement as deferred by product direction not to execute unit tests.

## Implementation Details

Use the testing expectations in the TechSpec "Testing Approach" section. This task can refine tests created earlier, but it should not expand component product scope or integrate the search page.

### Relevant Files

- `apps/frontend/src/app/shared/components/ui/proxi-map/proxi-map.component.spec.ts` — primary test file for this task.
- `apps/frontend/src/app/shared/components/ui/proxi-map/proxi-map.component.ts` — component behavior under test.
- `apps/frontend/src/app/shared/components/ui/card-detail/card-detail.spec.ts` — local example of Angular standalone component test style.
- `apps/frontend/src/app/modules/customer/search/search.spec.ts` — local example of service and router mocking patterns.

### Dependent Files

- `apps/frontend/src/app/shared/components/ui/proxi-map/proxi-map.component.html` — fallback and accessible container assertions may depend on template structure.
- `apps/frontend/src/app/shared/components/ui/proxi-map/proxi-map.component.scss` — marker class names may be referenced indirectly through generated popup or icon HTML.

### Related ADRs

- [ADR-002: Shared UI Component with Browser-Only Leaflet Loading](adrs/adr-002.md) — tests must validate the SSR-safe lifecycle.
- [ADR-003: Local Map Provider Contract and Search Page Adaptation](adrs/adr-003.md) — tests should use the local provider contract.

## Deliverables

- Expanded `ProxiMapComponent` unit test suite.
- Leaflet mocks that isolate tests from real map rendering.
- Coverage for SSR guard, markers, popups, bounds, updates, and cleanup.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for standalone TestBed rendering **(REQUIRED)**

## Tests

- Unit tests:
  - [x] Component skips Leaflet initialization when platform is not browser.
  - [x] Component initializes mocked Leaflet map once on browser platform.
  - [x] Component creates one user marker for a valid user location.
  - [x] Component creates provider markers for valid providers and ignores invalid coordinates.
  - [x] Component emits the provider id when the popup action handler is invoked.
  - [x] Component calls bounds fitting when user and provider points exist.
  - [x] Component removes the map on destroy.
- Integration tests:
  - [x] Standalone component imports in TestBed without a wrapper NgModule.
  - [x] Template renders fallback copy when user location is unavailable.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Component behavior is covered without real tile or network dependencies.
- SSR guard and cleanup regressions are detectable by tests.

Validation note: unit test execution and coverage measurement are deferred by product direction. The test coverage exists in `proxi-map.component.spec.ts` and was syntax/type-checked, but not executed with Karma.
