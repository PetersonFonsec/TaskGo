---
status: completed
title: Backend telemetry & feature flagging
type: backend
complexity: low
dependencies:
  - task_02
---

# Task 04: Backend telemetry & feature flagging

## Overview
Add telemetry events and a feature flag gate for the favorites MVP. Telemetry enables measurement of adoption and conversion; feature-flagging allows staged rollout.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Emit `favorite.add`, `favorite.remove`, `favorites.view`, and `favorites.searchFilter.used` events with clientId and providerId where applicable.
- Gate API behavior and UI visibility behind a `favorites_mvp` feature flag.
</requirements>

## Subtasks
- [x] 04.1 Add telemetry calls in FavoritesService for add/remove.
- [x] 04.2 Add feature flag checks in controllers and search integration.
- [x] 04.3 Add unit tests verifying telemetry calls and flag gating.

## Implementation Details
Integrate with existing telemetry and feature-flag services used in the backend.

### Relevant Files
- `apps/backend/src/modules/provider/favorites.service.ts` (new) — where telemetry is emitted.
- `apps/backend/src/shared/` — existing telemetry/feature flag utilities.

### Dependent Files
- Controller code that shows/hides endpoints or behavior based on the feature flag.

### Related ADRs
- [ADR-001](../favoritar-profissionais/adrs/adr-001.md)

## Deliverables
- Instrumented telemetry events and feature flag checks.
- Unit tests asserting event emission and flag behavior.

## Tests
- Unit tests:
  - [ ] `favorite.add` event emitted on addFavorite when flag enabled.
  - [ ] No events emitted and endpoints return 404/feature-disabled when flag disabled (as per product decision).

## Success Criteria
- Telemetry events appear in staging analytics pipeline.
- Feature flag controls availability as expected in tests.
