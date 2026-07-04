---
status: completed
title: Persist administrative identities, provider lifecycle, and audit models
type: backend
complexity: high
dependencies: []
---

# Task 01: Persist administrative identities, provider lifecycle, and audit models

## Overview
Extend the existing Prisma domain with the storage required for administrative identities, provider lifecycle decisions, and immutable audit records. The migration must preserve existing provider behavior while establishing deterministic statuses for the Backoffice.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST add the AdminRole, ProviderStatus, and provider-decision action enums defined in TechSpec "Data Models".
2. MUST add AdminUser, ProviderDecision, and AuditLog with required constraints, relations, and query indexes.
3. MUST migrate verified providers to APPROVED and unverified providers to PENDING without losing data.
4. MUST keep Provider.verified compatible and synchronized until its later removal.
5. MUST prevent administrative and audit history from being orphaned by operator deletion.
</requirements>

## Subtasks
- [x] 01.1 Extend the Prisma schema with all administrative and lifecycle types.
- [x] 01.2 Add indexes for provider queues, decision history, and supported audit filters.
- [x] 01.3 Create a deterministic migration for existing provider records.
- [x] 01.4 Update provider creation paths to initialize the lifecycle status consistently.
- [x] 01.5 Add schema and migration regression tests.

## Implementation Details
Follow TechSpec "Data Models" and ADR-003/ADR-004. Keep the compatibility change localized to provider persistence and creation paths.

### Relevant Files
- `apps/backend/src/prisma/schema.prisma` — authoritative persistence model.
- `apps/backend/src/prisma/migrations/` — sequential PostgreSQL migrations.
- `apps/backend/src/modules/user/commands/create-user/strategies/create-provider.strategy.ts` — provider creation path.

### Dependent Files
- `apps/backend/src/modules/provider/provider.service.ts` — consumes provider verification and status.
- `apps/backend/test/fixtures/user.factory.ts` — creates provider fixtures.

### Related ADRs
- [ADR-003: Dedicated Administrative Identities With Shared JWT Secret](adrs/adr-003.md)
- [ADR-004: Explicit Provider Commands With Transactional Audit](adrs/adr-004.md)

## Deliverables
- Prisma models, enums, constraints, relations, and indexes.
- Forward migration with deterministic compatibility mapping.
- Updated provider creation defaults.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for migration and constraints **(REQUIRED)**

## Tests
- Unit tests:
  - [x] New provider creation sets PENDING and verified=false.
  - [x] Provider fixtures preserve explicit lifecycle status.
- Integration tests:
  - [x] Existing verified rows migrate to APPROVED and unverified rows to PENDING.
  - [x] Duplicate admin email and invalid lifecycle relations are rejected.
  - [x] Required provider and audit indexes exist after migration.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Migration preserves every existing provider row.
- Prisma generation and migration validation succeed.
