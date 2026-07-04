---
status: completed
title: Expose provider queue, details, and history
type: backend
complexity: high
dependencies:
  - task_01
  - task_03
---

# Task 06: Expose provider queue, details, and history

## Overview
Add read-only administrative provider endpoints for the review queue, complete provider context, and lifecycle history. Responses must be paginated, role-protected, privacy-conscious, and suitable for Administrator and Support workflows.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST expose GET /admin/providers, /:id, and /:id/history with the declared permissions.
2. MUST support bounded pagination plus status and submission-date filters.
3. MUST return identity, verification, services, operational history, status, and decision context required by the PRD.
4. MUST omit credentials, raw payment payloads, and unrelated personal data.
5. MUST use indexed queries and avoid unbounded relation loading.
</requirements>

## Subtasks
- [x] 06.1 Define provider query and response DTOs.
- [x] 06.2 Implement filtered provider queue queries.
- [x] 06.3 Implement provider review detail projection.
- [x] 06.4 Implement chronological decision-history queries.
- [x] 06.5 Apply Administrator and Support authorization.
- [x] 06.6 Add query and endpoint coverage.

## Implementation Details
Follow TechSpec "Providers" API and reuse existing provider relations without public-controller reuse.

### Relevant Files
- `apps/backend/src/modules/provider/provider.service.ts` — existing provider projections and filters.
- `apps/backend/src/modules/provider/provider.controller.ts` — public routes that remain separate.
- `apps/backend/src/shared/services/pagination/pagination.interface.ts` — paging response contract.

### Dependent Files
- `apps/backend/src/modules/services/services.service.ts` — provider-service context.
- `apps/backend/src/modules/order/order.service.ts` — operational history source.

### Related ADRs
- [ADR-001: Deliver the Backoffice Through Complete Operational Verticals](adrs/adr-001.md)
- [ADR-002: Separate Backoffice Frontend With Shared API](adrs/adr-002.md)

## Deliverables
- Provider queue, detail, and history endpoints.
- Bounded query DTOs and privacy-safe response projections.
- Query plans appropriate for representative data volume.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for provider reads and roles **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Status and date filters map to the expected query predicates.
  - [x] limit above 100 is rejected or capped at 100.
  - [x] Response projections exclude credentials and raw provider payloads.
- Integration tests:
  - [x] Administrator and Support can read; Finance and Moderator receive 403.
  - [x] History is chronological and preserves deactivated actor identity.
  - [x] Missing provider returns 404.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Supported filters return stable paginated results.
- Review responses contain all PRD-required provider context without forbidden fields.
