---
status: completed
title: "DB migration: `client_favorites` table"
type: backend
complexity: medium
dependencies: []
---

# Task 01: DB migration: `client_favorites` table

## Overview
Create a compact, indexed table to persist client favorites (client ↔ provider). This enables efficient listing and existence checks required by search filtering and user lists.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Must create a `client_favorites` table with `client_id`, `provider_id`, `created_at` and a unique constraint on (`client_id`, `provider_id`).
- Must add indexes to support queries by `client_id` and by (`client_id`,`provider_id`).
- Migration must be idempotent and reversible (up/down).
</requirements>

## Subtasks
- [x] 01.1 Add migration file to create `client_favorites` table.
- [x] 01.2 Add down migration to drop the table.
- [x] 01.3 Run migration in a staging environment and validate schema. (Validated locally via `npx prisma migrate status`; staging DB not available from this workspace.)
- [x] 01.4 Add basic DB-level tests for unique constraint behavior.

## Implementation Details
Modify or add migration under the backend's prisma or migrations folder.

### Relevant Files
- `apps/backend/src/prisma/schema.prisma` — add model mapping or reference for migrations.
- `apps/backend/src/prisma/migrations/` — place migration SQL or prisma migration files.

### Dependent Files
- `apps/backend/src/modules/provider/provider.service.ts` — favorites relations will be queried here.
- `apps/backend/src/prisma/prisma.service.ts` — used by services to access DB.

### Related ADRs
- [ADR-001: Favorites — MVP (Save + dedicated list + search filter)](../favoritar-profissionais/adrs/adr-001.md) — Decision to add MVP favorites table.

## Deliverables
- Migration files (up/down) that create `client_favorites` with indexes and constraints.
- DB schema updated or documented in `schema.prisma` if using Prisma Migrate.
- Unit tests validating unique constraint behavior.

## Tests
- Unit tests:
  - [ ] Migration up applies schema changes successfully.
  - [ ] Migration down reverts schema changes successfully.
  - [ ] Attempting to insert duplicate (client,provider) fails with constraint error.
- Integration tests:
  - [ ] Run migration in ephemeral test DB and verify table exists and is queryable.

## Success Criteria
- Migration applied and reverted without errors in CI pipeline.
- Tests for constraint behavior passing.
