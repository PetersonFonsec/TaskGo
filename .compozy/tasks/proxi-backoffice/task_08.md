---
status: completed
title: Build provider operational dashboard API
type: backend
complexity: medium
dependencies:
  - task_06
  - task_07
---

# Task 08: Build provider operational dashboard API

## Overview
Expose the provider-focused operational indicators required by the MVP dashboard. Aggregations must use provider lifecycle and decision data, support a bounded date range, and remain available only to Administrator and Support.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST expose GET /admin/dashboard/providers for Administrator and Support.
2. MUST return pending count, action totals, average review duration, and recent sensitive actions.
3. MUST accept validated date boundaries and define an explicit default reporting window.
4. MUST calculate metrics consistently from ProviderDecision and provider timestamps.
5. SHOULD remain below 500 ms p95 under the agreed MVP profile.
</requirements>

## Subtasks
- [x] 08.1 Define dashboard query and response contracts.
- [x] 08.2 Implement queue and decision aggregations.
- [x] 08.3 Implement average review-time calculation.
- [x] 08.4 Include bounded recent administrative actions.
- [x] 08.5 Add authorization, accuracy, and query-performance tests.

## Implementation Details
Follow TechSpec "Dashboard and Audit" and "Performance Tests". Avoid broad marketplace analytics outside the provider vertical.

### Relevant Files
- `apps/backend/src/modules/auth/provider-home.service.ts` — existing dashboard aggregation pattern.
- `apps/backend/src/modules/auth/provider-home.service.spec.ts` — dashboard unit-test convention.
- `apps/backend/src/prisma/schema.prisma` — indexed lifecycle data.

### Dependent Files
- `apps/backend/src/tracing.ts` — endpoint and Prisma duration traces.
- `config/prometheus.yaml` — operational scrape configuration.

### Related ADRs
- [ADR-001: Deliver the Backoffice Through Complete Operational Verticals](adrs/adr-001.md)
- [ADR-005: Comprehensive Backoffice Verification Gate](adrs/adr-005.md)

## Deliverables
- Provider dashboard endpoint and typed response.
- Accurate bounded aggregations and reporting defaults.
- Representative query-performance evidence.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for dashboard metrics **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Empty data returns zero counts and a defined empty average.
  - [x] Decisions outside the selected period are excluded.
  - [x] Review duration uses the first terminal decision timestamp.
- Integration tests:
  - [x] Aggregates match seeded pending, approved, rejected, blocked, and unblocked records.
  - [x] Finance and Moderator receive 403.
  - [x] Representative dataset query stays within the documented threshold.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Dashboard values reconcile with underlying lifecycle records.
- Endpoint meets the accepted p95 target under the documented profile.
