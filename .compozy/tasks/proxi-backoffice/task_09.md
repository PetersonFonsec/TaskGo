---
status: completed
title: Expose paginated audit log queries
type: backend
complexity: medium
dependencies:
    - task_03
    - task_04
---

# Task 09: Expose paginated audit log queries

## Overview
Provide Administrator-only search and detail endpoints for immutable audit records. The query surface must support operational investigation without adding mutation capabilities or leaking sensitive state.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST expose GET /admin/audit-logs and /:id only to Administrator.
2. MUST filter by operator, action, target identifiers, and date range.
3. MUST enforce default limit 25, maximum 100, deterministic descending order, and stable metadata.
4. MUST return actor snapshots after operator deactivation.
5. MUST expose no audit mutation route and SHOULD meet 500 ms p95 for the accepted dataset.
</requirements>

## Subtasks
- [ ] 09.1 Define bounded audit query DTOs and responses.
- [ ] 09.2 Implement indexed filtered listing.
- [ ] 09.3 Implement privacy-safe detail lookup.
- [ ] 09.4 Enforce Administrator-only access and immutable routing.
- [ ] 09.5 Add filter, paging, privacy, and performance coverage.

## Implementation Details
See TechSpec "Dashboard and Audit". Use explicit supported filters instead of the generic free-form search parser.

### Relevant Files
- `apps/backend/src/shared/services/pagination/pagination.service.ts` — metadata convention and current limitations.
- `apps/backend/src/shared/utils/queryParams.ts` — generic search behavior not suitable for privileged arbitrary fields.
- `apps/backend/src/prisma/schema.prisma` — audit indexes.

### Dependent Files
- `apps/backend/src/shared/interceptors/bigint.interceptor.ts` — serializes BigInt response identifiers.
- `apps/backend/src/tracing.ts` — query-duration traces.

### Related ADRs
- [ADR-004: Explicit Provider Commands With Transactional Audit](adrs/adr-004.md)
- [ADR-005: Comprehensive Backoffice Verification Gate](adrs/adr-005.md)

## Deliverables
- Read-only audit list and detail endpoints.
- Indexed bounded filters and stable pagination metadata.
- Privacy and immutable-route verification.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for audit investigations **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Each supported filter produces only its intended predicate.
  - [ ] Default and maximum limits are enforced.
  - [ ] Detail projection excludes secrets and unnecessary personal fields.
- Integration tests:
  - [ ] Combined operator, action, entity, and date filters return exact matches.
  - [ ] Support, Finance, and Moderator receive 403.
  - [ ] PUT, PATCH, and DELETE have no audit routes.
  - [ ] Representative search remains within the documented p95 threshold.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Administrators can retrieve a seeded event with every supported filter.
- No application endpoint mutates an audit record.

