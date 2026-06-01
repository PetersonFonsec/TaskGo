---
status: completed
title: Backend API & search integration
type: backend
complexity: medium
dependencies:
  - task_02
---

# Task 03: Backend API & search integration

## Overview
Add REST endpoints for clients to add/remove/list favorites and integrate the `onlyFavorites` filter into existing search/listing endpoints so authenticated clients can restrict results to their saved providers.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Implement POST/DELETE/GET endpoints scoped to `clients/{clientId}/favorites` and integrate `onlyFavorites=true` query param into provider search.
- Endpoints must validate authenticated `clientId` and be idempotent.
- Search endpoint must use `client_favorites` when `onlyFavorites` is set.
</requirements>

## Subtasks
- [x] 03.1 Add controller endpoints for add/remove/list favorites.
- [x] 03.2 Integrate search filtering (`onlyFavorites`) in provider listing flows.
- [x] 03.3 Add API integration tests for endpoints and search behavior.

## Implementation Details
Add controller methods under `apps/backend/src/modules/provider` or create `favorites.controller.ts` under `modules/provider` to keep related code together.

### Relevant Files
- `apps/backend/src/modules/provider/provider.controller.ts` — existing provider endpoints; extend or add new controller.
- `apps/backend/src/modules/provider/provider.service.ts` — integrate listFavorites where appropriate.
- `apps/backend/src/prisma/schema.prisma` — DB model reference.

### Dependent Files
- `apps/backend/src/modules/auth/` — ensure endpoints require authenticated client context.
- `apps/backend/src/shared/pagination` — reuse existing pagination patterns for list endpoints.

### Related ADRs
- [ADR-001](../favoritar-profissionais/adrs/adr-001.md)

## Deliverables
- Controller and route implementations with API tests.
- Integration test demonstrating `onlyFavorites` filters search results to favorites only.

## Tests
- Unit tests:
  - [ ] Controller validation of inputs and auth.
  - [ ] Search filtering logic.
- Integration tests:
  - [ ] End-to-end: add favorite → search with onlyFavorites → result contains only favorited providers.

## Success Criteria
- API endpoints behave idempotently and securely.
- Search `onlyFavorites` filter returns correct results in integration tests.
