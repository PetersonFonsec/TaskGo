---
status: pending
title: "Frontend: Search filter toggle and persistence"
type: frontend
complexity: medium
dependencies:
  - task_05
---

# Task 07: Frontend: Search filter toggle and persistence

## Overview
Add a "Show only favorites" filter to the search/results UI and persist the preference per user so it remains across sessions (per product decision).

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Filter toggles the `onlyFavorites` query param on search requests and persists preference (via user settings API or local storage depending on TechSpec).
- Accessible control with clear label and state.
- Persisted preference must be respected on subsequent visits for the same authenticated client.
</requirements>

## Subtasks
- [x] 07.1 Add toggle UI to search header (`search.html`).
- [x] 07.2 Wire toggle to call search with `onlyFavorites` flag.
- [x] 07.3 Persist preference per user and load on page init.
- [x] 07.4 Add tests for filter behavior and persistence.

## Implementation Details
Modify search module templates and provider service to support a `onlyFavorites` parameter in requests.

### Relevant Files
- `apps/frontend/src/app/modules/customer/search/search.html` and `.ts` — UI and logic for search.
- `apps/frontend/src/app/shared/service/provider/provider.ts` — add `onlyFavorites` parameter handling.

### Dependent Files
- Backend search integration (Task 03) must support `onlyFavorites` query param.

### Related ADRs
- [ADR-001](../favoritar-profissionais/adrs/adr-001.md)

## Deliverables
- Filter UI, persistence logic, and integration tests.

## Tests
- Unit tests:
  - [ ] Toggle changes query parameter passed to provider service.
  - [ ] Preference persisted and restored on page init.
- Integration tests:
  - [ ] Search with `onlyFavorites` returns only favorited providers end-to-end.

## Success Criteria
- Filter persists between sessions and integration tests pass.
