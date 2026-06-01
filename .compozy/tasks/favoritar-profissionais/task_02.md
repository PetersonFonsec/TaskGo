---
status: completed
title: "Backend service: favorites domain logic"
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 02: Backend service: favorites domain logic

## Overview
Implement the server-side domain logic for favorites: add, remove, and list operations. Provide a small service that encapsulates DB access and basic validation (idempotency, client ownership).

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Service must expose addFavorite(clientId, providerId), removeFavorite(clientId, providerId), listFavorites(clientId, paging).
- Must handle idempotent adds and safe deletes.
- Must emit telemetry events `favorite.add` and `favorite.remove` (or call telemetry service).
</requirements>

## Subtasks
- [x] 02.1 Implement `FavoritesService` with add/remove/list methods.
- [x] 02.2 Add unit tests for service methods including idempotency and error paths.
- [x] 02.3 Wire service into providers module (register provider in module providers array).

## Implementation Details
Create a new module or add to `modules/provider` a `favorites.service.ts` and optionally a `favorites.module.ts` if modularization preferred.

### Relevant Files
- `apps/backend/src/modules/provider/provider.service.ts` — consumer of favorites for profile fetches.
- `apps/backend/src/prisma/prisma.service.ts` — DB access used by the service.
- `apps/backend/src/prisma/schema.prisma` — reference for new table.

### Dependent Files
- `apps/backend/src/modules/provider/provider.controller.ts` — may call the service once endpoints exist.

### Related ADRs
- [ADR-001](../favoritar-profissionais/adrs/adr-001.md)

## Deliverables
- `FavoritesService` implementation with unit tests.
- Service registered in DI container and covered by unit tests.

## Tests
- Unit tests:
  - [ ] addFavorite returns success for new favorite and does not duplicate on repeated calls.
  - [ ] removeFavorite removes existing favorite and is idempotent.
  - [ ] listFavorites returns paginated results for a client.
- Integration tests:
  - [ ] Service operations against test DB (requires migration applied).

## Success Criteria
- All service unit tests pass.
- Integration tests validate DB interactions.
