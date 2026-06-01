---
status: pending
title: "Frontend: Favorites view and route"
type: frontend
complexity: medium
dependencies:
  - task_05
---

# Task 06: Frontend: Favorites view and route

## Overview
Provide a dedicated `Favorites` view accessible from the client menu where a client can browse and manage saved providers.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Favorites view must call `GET /clients/{clientId}/favorites` and render provider cards.
- Allow unfavorite action inline and confirm list updates.
- Provide empty state with guidance and CTA to search for providers.
</requirements>

## Subtasks
- [x] 06.1 Add route and menu entry for `Favorites` in client navigation.
- [x] 06.2 Implement Favorites page and UI using `app-card-detail` components.
- [x] 06.3 Add tests for list rendering and unfavorite flows.

## Implementation Details
Add a route under customer module and a new `favorites` component that uses provider service to fetch favorites.

### Relevant Files
- `apps/frontend/src/app/modules/customer/search/search.html` — example of listing providers.
- `apps/frontend/src/app/shared/components/ui/card-detail/card-detail.ts` — reuse card UI.
- `apps/frontend/src/app/modules/customer/customer.routes.ts` — add new route.

### Dependent Files
- Provider service methods to list favorites (frontend service updates required by Task 05).

### Related ADRs
- [ADR-001](../favoritar-profissionais/adrs/adr-001.md)

## Deliverables
- New `Favorites` route and component with integration to API.
- Acceptance tests for list and unfavorite flows.

## Tests
- Unit tests:
  - [ ] Component renders provider cards from API response.
  - [ ] Unfavorite removes provider from list in UI.
- Integration tests:
  - [ ] End-to-end: add favorite in search view, open Favorites view, see item present.

## Success Criteria
- Favorites page renders reliably and integration tests pass.
